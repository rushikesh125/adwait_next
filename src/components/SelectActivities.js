import React, { useState, useEffect } from "react";
import "@/components/css/SelectActivities.css";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase/config";

const SelectActivities = ({ onDone }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedState, setSelectedState] = useState("");
  const [states, setStates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState([]);
  const [selectedActivitiesfit, setSelectedActivitiesfit] = useState([]);
  const [selectedActivitiesgroup, setSelectedActivitiesgroup] = useState([]);
  const [selectedActivities, setSelectedActivities] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [pricingType, setPricingType] = useState("fit");

  const handleSelectClick = () => {
    setShowDropdown(true);
  };
  useEffect(() => {
    setSelectedActivities([...selectedActivitiesfit, ...selectedActivitiesgroup]);
  }, [selectedActivitiesfit,selectedActivitiesgroup]);
  useEffect(() => {
    const fetchStates = async () => {
      try {
        const snapshot = await getDocs(collection(db, "locations"));
        const stateNames = snapshot.docs.map((doc) => doc.data().name);
        setStates(stateNames);
      } catch (error) {
        console.error("Error fetching states:", error);
      } finally {
        setLoading(false);
      }
    };

    if (showDropdown && states.length === 0) {
      fetchStates();
    }
  }, [showDropdown]);

  useEffect(() => {
    const savedPricingType = localStorage.getItem("pricingType");
    if (savedPricingType) {
      setPricingType(savedPricingType);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("pricingType", pricingType);
  }, [pricingType]);

  useEffect(() => {
    const fetchActivities = async () => {
      if (!selectedState) return;

      setActivityLoading(true);
      try {
        const snapshot = await getDocs(collection(db, "activities"));
        const allActivities = snapshot.docs.map((doc) => doc.data());
        const filtered = allActivities.filter(
          (activity) => activity.state === selectedState
        );
        setActivities(filtered);
        setSelectedActivities([]);
      } catch (error) {
        console.error("Error fetching activities:", error);
      } finally {
        setActivityLoading(false);
      }
    };

    fetchActivities();
  }, [selectedState]);

  const handleActivityToggle = (activity,pricingType) => {
    
    if(pricingType==="fit"){
      const exists = selectedActivitiesfit.find((a) => a.name === activity.name);
    if (exists) {
      setSelectedActivitiesfit((prev) =>
        prev.filter((a) => a.name !== activity.name)
      );
  }else {
      setSelectedActivitiesfit((prev) => [
        ...prev,
        { ...activity, participants: 1 },
      ]);
    }
  };
  if(pricingType==="group"){
    const exists = selectedActivitiesgroup.find((a) => a.name === activity.name);
    if (exists) {
      setSelectedActivitiesgroup((prev) =>
        prev.filter((a) => a.name !== activity.name)
      );
  }else {
      setSelectedActivitiesgroup((prev) => [
        ...prev,
        { ...activity, participants: 10 },
      ]);
    }
  }
}

  const handleParticipantChange = (activityName, count,pricingType) => {
    if(pricingType==="fit"){
    setSelectedActivitiesfit((prev) =>
      prev.map((a) =>
        a.name === activityName
          ? { ...a, participants: Math.max(1, parseInt(count) || 1) }
          : a
      )
    );
    };
    if(pricingType==="group"){
    setSelectedActivitiesgroup((prev) =>
      prev.map((a) =>
        a.name === activityName
          ? { ...a, participants: Math.max(10, parseInt(count) || 10) }
          : a
      )
    );
  }
}
  

  const totalActivityPriceforFIT = selectedActivitiesfit.reduce((sum, act) => {
    const rate = parseFloat(act.fitRatePerPerson);
    const people = act.participants || 1;
    return sum + (!isNaN(rate) ? rate * people : 0);
  }, 0);
  const totalActivityPriceforGroup = selectedActivitiesgroup.reduce((sum, act) => {
    const rate =parseFloat(act.groupRatePerPerson);
    const people = act.participants || 1;
    return sum + (!isNaN(rate) ? rate * people : 0);
  }, 0);
  const totalActivityPrice = totalActivityPriceforFIT+totalActivityPriceforGroup;


  const handleDoneClick = () => {
    const finalActivitiesfit = selectedActivitiesfit.map((act) => {
      const rate = parseFloat(act.fitRatePerPerson);
      const participants = act.participants || 1;
      const totalPrice = rate * participants;

      return {
        ...act,
        participants,
        totalPrice,
      };
    });
    const finalActivitiesgroup = selectedActivitiesgroup.map((act) => {
      const rate =parseFloat(act.groupRatePerPerson);
      const participants = act.participants || 1;
      const totalPrice = rate * participants;

      return {
        ...act,
        participants,
        totalPrice,
      };
    });
    const finalActivities = [...finalActivitiesfit, ...finalActivitiesgroup];
    const totalActivityPrice = finalActivities.reduce(
      (sum, act) => sum + act.totalPrice,
      0
    );

    onDone(finalActivities, totalActivityPrice);
  };

  return (
    <div className="select-activities">
      {!showDropdown ? (
        <button onClick={handleSelectClick} className="select-activities-btn">
          Select Activities
        </button>
      ) : loading ? (
        <p>Loading states...</p>
      ) : (
        <div>
          <select
            className="state-dropdown"
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
          >
            <option value="" disabled>
              Select State
            </option>
            {states.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>

          {selectedState && (
            <div className="pricing-type-toggle" style={{ margin: "10px 0" }}>
              <label style={{ marginRight: "20px" }}>
                FIT (Individual)
              </label>
              {activityLoading ? (
            <p>Loading activities...</p>
          ) : selectedState ? (
            activities.length > 0 ? (
              <div className="activities-list">
                <h4> Activities in {selectedState}</h4>
                <ul>
                  {activities
                    .filter(
                      (act) =>
                        !selectedActivitiesgroup.some((a) => a.name === act.name)
                    )
                    .map((act, idx) => {
                    const selected = selectedActivitiesfit.find(
                      (a) => a.name === act.name
                    );
                    const isChecked = !!selected;
                    const rate = act.fitRatePerPerson;
                    const participants = selected?.participants || 1;

                    return (
                      <li key={idx} style={{ marginBottom: "8px" }}>
                        <label>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setPricingType("fit");
                              handleActivityToggle(act, "fit");
                            }}
                          />
                          <strong> {act.name}</strong> ({act.city}) – ₹{rate}
                        </label>

                        {isChecked && (
                          <input
                            type="number"
                            min="1"
                            value={participants}
                            onChange={(e) =>
                              handleParticipantChange(
                                act.name,
                                e.target.value,
                                pricingType
                              )
                            }
                            className="participant-input"
                            placeholder="People"
                          />
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <p>No activities found for {selectedState}.</p>
            )
          ) : null}

              <label style={{ marginLeft: "30px" }}>

                Group (10+)
              </label>
              {activityLoading ? (
            <p>Loading activities...</p>
          ) : selectedState ? (
            activities.length > 0 ? (
              <div className="activities-list">
                <h4> Activities in {selectedState}</h4>
                <ul>
                  {activities
                    .filter(
                      (act) =>
                        !selectedActivitiesfit.some((a) => a.name === act.name)
                    )
                    .map((act, idx) => {
                    const selected = selectedActivitiesgroup.find(
                      (a) => a.name === act.name
                    );
                    const isChecked = !!selected;
                    const rate = act.groupRatePerPerson;
                    const participants = selected?.participants || 1;

                    return (
                      <li key={idx} style={{ marginBottom: "8px" }}>
                        <label>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setPricingType("group");
                              handleActivityToggle(act, "group");
                            }}
                          />
                          <strong> {act.name}</strong> ({act.city}) – ₹{rate}
                        </label>

                        {isChecked && (
                          <input
                            type="number"
                            min="1"
                            value={participants}
                            onChange={(e) =>
                              handleParticipantChange(
                                act.name,
                                e.target.value,
                                "group"
                              )
                            }
                            className="participant-input"
                            placeholder="People"
                          />
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <p>No activities found for {selectedState}.</p>
            )
          ) : null}
            </div>
            
          )}

          

          {(selectedActivitiesgroup.length > 0 || selectedActivitiesfit.length > 0) && (
            <div className="selected-activities-summary">
              <h4> Selected Activities</h4>
              <ul>
                {selectedActivitiesfit.map((act, idx) => {
                  const rate = parseFloat(act.fitRatePerPerson);
                  const people = act.participants || 1;
                  const total = rate * people;
                  return (
                    <li key={idx}>
                      {act.name} FIT ({act.city}) – ₹{rate} × {people} = ₹{total}
                    </li>
                  );
                })}
              </ul>
              <ul>
                {selectedActivitiesgroup.map((act, idx) => {
                  const rate = parseFloat(act.groupRatePerPerson);
                  const people = act.participants || 1;
                  const total = rate * people;
                  return (
                    <li key={idx}>
                      {act.name} GROUP ({act.city}) – ₹{rate} × {people} = ₹{total}
                    </li>
                  );
                })}
              </ul>
              <p style={{ marginTop: "10px", fontWeight: "bold" }}>
                 Total Activity Price: ₹{totalActivityPrice}
              </p>
            </div>
          )}

          {selectedActivities.length > 0 && (
            <button className="done-activities-btn" onClick={handleDoneClick}>
              Done
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default SelectActivities;
