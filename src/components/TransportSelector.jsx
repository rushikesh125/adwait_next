import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase/config";
import "@/components/css/SelectTransport.css";

const SelectTransport = ({ onTransportSelect }) => {
  const [states, setStates] = useState([]);
  // We'll remove 'selectClicked' as its primary purpose was to control the initial button visibility.
  // Instead, 'showSelectionUI' will control the detailed selection interface.
  const [showSelectionUI, setShowSelectionUI] = useState(false);
  const [selectedStateId, setSelectedStateId] = useState("");
  const [packages, setPackages] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [selectedVehicleIndex, setSelectedVehicleIndex] = useState(null);
  const [isFinalized, setIsFinalized] = useState(false);
  const [selectedTransport, setSelectedTransport] = useState(null);
  const [isCustomizing, setIsCustomizing] = useState(false);

  const [customVehicleType, setCustomVehicleType] = useState("");
  const [customSeats, setCustomSeats] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [customAC, setCustomAC] = useState(false);

  const setInSession = (key, value) => {
    sessionStorage.setItem(key, JSON.stringify(value));
  };

  const getFromSession = (key) => {
    const itemStr = sessionStorage.getItem(key);
    if (!itemStr) return null;
    try {
      return JSON.parse(itemStr);
    } catch (error) {
      sessionStorage.removeItem(key);
      return null;
    }
  };

  useEffect(() => {
    const navigationType = performance.getEntriesByType("navigation")[0]?.type;

    // Reset transport state on full page reload
    if (navigationType === "reload") {
      sessionStorage.removeItem("selectedTransportPackage");
      setSelectedTransport(null);
      // setSelectClicked(false); // No longer needed
      setShowSelectionUI(false); // Hide selection UI on reload
      setSelectedStateId("");
      setPackages([]);
      setSelectedPackage(null);
      setSelectedVehicleIndex(null);
      setIsFinalized(false);
      setIsCustomizing(false);
      setCustomVehicleType("");
      setCustomSeats("");
      setCustomPrice("");
      setCustomAC(false);
    } else {
      const saved = getFromSession("selectedTransportPackage");
      if (saved) {
        setSelectedTransport(saved);
        // setSelectClicked(true); // No longer needed
        setIsFinalized(true);
        // Don't show selection UI if already finalized on initial load
        setShowSelectionUI(false);
      }
    }
  }, []);

  // Simplified the useEffect for navigation type 1 as the above one covers it.
  // This one can be removed if the above useEffect is sufficient for all reload scenarios.
  // useEffect(() => {
  //   if (
  //     performance.navigation.type === 1 ||
  //     performance.getEntriesByType("navigation")[0]?.type === "reload"
  //   ) {
  //     sessionStorage.removeItem("selectedTransportPackage");
  //   }
  // }, []);

  useEffect(() => {
    const fetchStates = async () => {
      try {
        const transportCollection = collection(db, "transport");
        const snapshot = await getDocs(transportCollection);
        const stateList = snapshot.docs.map((doc) => ({
          id: doc.id,
          stateName: doc.data().stateName,
        }));
        setStates(stateList);
      } catch (error) {
        console.error("Error fetching transport states:", error);
      }
    };

    // Fetch states whenever the selection UI is shown
    if (showSelectionUI) {
      fetchStates();
    }
  }, [showSelectionUI]); // Dependency changed to showSelectionUI

  const handleSelectTransportClick = () => {
    setShowSelectionUI(true); // Show the detailed selection UI
    // Reset selection if clicking "Select Transport" after a previous selection
    setSelectedStateId("");
    setPackages([]);
    setSelectedPackage(null);
    setSelectedVehicleIndex(null);
    setIsCustomizing(false);
    setIsFinalized(false); // Reset finalized state to allow new selection
    setSelectedTransport(null); // Clear previous selection
  };

  const handleStateChange = async (e) => {
    const stateId = e.target.value;
    setSelectedStateId(stateId);
    setPackages([]);
    setSelectedPackage(null);
    setSelectedVehicleIndex(null);
    setIsFinalized(false);
    setIsCustomizing(false);

    if (stateId) {
      console.log("Fetching packages for state:", stateId);
      try {
        const packagesCollection = collection(
          db,
          "transport",
          stateId,
          "packages"
        );
        const snapshot = await getDocs(packagesCollection);
        const list = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setPackages(list);
      } catch (error) {
        console.error("Error fetching packages:", error);
      }
    }
  };

  const handlePackageSelect = (pkg) => {
    setSelectedPackage(pkg);
    setSelectedVehicleIndex(null);
    setIsCustomizing(false);
    setIsFinalized(false);
  };

  const handleVehicleSelect = (index) => {
    setSelectedVehicleIndex(index);
    setIsFinalized(false);
  };

  const handleCustomizeTransport = (pkg) => {
    setSelectedPackage(pkg);
    setIsCustomizing(true);
    setSelectedVehicleIndex(null);
    setCustomVehicleType("");
    setCustomSeats("");
    setCustomPrice("");
    setCustomAC(false);
    setIsFinalized(false);
  };

  const handleDone = () => {
    let finalVehicle = null;

    if (isCustomizing) {
      if (!customVehicleType || !customSeats || !customPrice) {
        alert("Please fill all custom vehicle details.");
        return;
      }
      finalVehicle = {
        type: customVehicleType,
        seating: customSeats,
        price: Number(customPrice),
        ac: customAC,
        isCustom: true,
      };
    } else if (
      selectedPackage &&
      selectedVehicleIndex !== null &&
      selectedPackage.vehicles[selectedVehicleIndex]
    ) {
      finalVehicle = {
        ...selectedPackage.vehicles[selectedVehicleIndex],
        isCustom: false,
        vehicles:selectedPackage,
      };
    } else {
      alert("Please select a vehicle or customize one.");
      return;
    }

    const finalSelection = {
      ...selectedPackage, // This might be null if only custom transport is selected
      selectedVehicle: finalVehicle,
      allPkgs: packages,
      totalPrice: Number(finalVehicle.price),
    };

    setSelectedTransport(finalSelection);
    setInSession("selectedTransportPackage", finalSelection);
    onTransportSelect(finalSelection);
    setIsFinalized(true);
    setShowSelectionUI(false); // Hide the detailed selection UI after "Done"
  };

  return (
    <div className="select-transport-container">
      {/* The "Select Transport" button is always rendered */}
      <button onClick={handleSelectTransportClick}>
        {selectedTransport ? "Edit Transport" : "Select Transport"}
      </button>

      {/* Show the detailed selection UI only when showSelectionUI is true */}
      {showSelectionUI && (
        <div className="transport-selection-details">
          <div className="dropdown-wrapper">
            <label htmlFor="stateSelect">Select State:</label>
            <select
              id="stateSelect"
              onChange={handleStateChange}
              value={selectedStateId}
            >
              <option value="">-- Choose a State --</option>
              {states.map((state) => (
                <option key={state.id} value={state.id}>
                  {state.stateName}
                </option>
              ))}
            </select>
          </div>

          {packages.length > 0 && !selectedPackage && (
            <div className="packages-list">
              <h3>Available Transport Packages:</h3>
              {packages.map((pkg) => (
                <div key={pkg.id} className="package-card">
                  <h4>{pkg.name}</h4>
                  <p> {pkg.days} Days / {pkg.nights} Nights</p>
                  <p> Pricing Type: {pkg.pricingType}</p>
                  <ul>
                    {pkg.vehicles.map((vehicle, idx) => (
                      <li key={idx}>
                        {vehicle.type} - ₹{vehicle.price ?? vehicle.perKmprice ?? "N/A"} - {vehicle.seating} seats{" "}
                        {vehicle.ac ? "(AC)" : "(Non-AC)"}

                      </li>
                    ))}
                  </ul>
                  <div className="package-btn-row">
                    <button onClick={() => handlePackageSelect(pkg)}>
                      Select this Package
                    </button>
                    <button onClick={() => handleCustomizeTransport(pkg)}>
                      Customize Transport
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedPackage && !isCustomizing && (
            <div className="vehicle-selection">
              <h4> Select Vehicle for {selectedPackage.name}</h4>
              <select
                onChange={(e) => handleVehicleSelect(parseInt(e.target.value))}
                value={selectedVehicleIndex !== null ? selectedVehicleIndex : ""}
              >
                <option value="">-- Select a Vehicle --</option>
                {selectedPackage.vehicles.map((vehicle, idx) => (
                  <option key={idx} value={idx}>
                    {vehicle.type} - ₹{vehicle.price ?? vehicle.perKmprice ?? "N/A"} - {vehicle.seating} seats{" "}
                    {vehicle.ac ? "(AC)" : "(Non-AC)"}
                  </option>
                ))}
              </select>
              <button onClick={() => handleCustomizeTransport(selectedPackage)}>
                Customize Transport
              </button>
              <button onClick={handleDone}>Done</button>
              <button onClick={() => setShowSelectionUI(false)}>Cancel</button>
            </div>
          )}

          {isCustomizing && (
            <div className="custom-vehicle-inputs">
              <h4> Add Custom Vehicle</h4>
              <input
                type="text"
                placeholder="Vehicle Name"
                value={customVehicleType}
                onChange={(e) => setCustomVehicleType(e.target.value)}
              />
              <input
                type="number"
                placeholder="Number of Seats"
                value={customSeats}
                onChange={(e) => setCustomSeats(e.target.value)}
              />
              <input
                type="number"
                placeholder="Price"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
              />
              <label>
                <input
                  type="checkbox"
                  checked={customAC}
                  onChange={(e) => setCustomAC(e.target.checked)}
                />
                AC Available
              </label>
              <button onClick={handleDone}>Done</button>
              <button onClick={() => setShowSelectionUI(false)}>Cancel</button>
            </div>
          )}
        </div>
      )}

      {/* Display summary if transport is finalized, regardless of showSelectionUI */}
      {selectedTransport && isFinalized && !showSelectionUI && (
        <div className="transport-summary">
          <h4> Final Transport Summary</h4>
          <p><strong>Package:</strong> {selectedTransport.name || "Custom Transport"}</p>
          <p><strong>Vehicle Name:</strong> {selectedTransport.selectedVehicle.type}</p>
          <p><strong>Seats:</strong> {selectedTransport.selectedVehicle.seating}</p>
          <p><strong>Price:</strong> ₹{selectedTransport.selectedVehicle.price ?? selectedTransport.selectedVehicle.perKmprice ?? "N/A"}</p>
          <p><strong>AC:</strong> {selectedTransport.selectedVehicle.ac ? "Yes" : "No"}</p>
        </div>
      )}
    </div>
  );
};

export default SelectTransport;