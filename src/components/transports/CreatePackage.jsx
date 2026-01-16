"use client"
import React, { useEffect, useState } from 'react';
import { db } from '@/firebase/config';
import { collection, getDocs, doc, updateDoc, setDoc, getDoc } from 'firebase/firestore'; // Included setDoc for subcollection
import { v4 as uuidv4 } from 'uuid';

const defaultVehicles = [
    { type: "Sedan", price: null, seating: null, ac: true, perKmprice: null },
    { type: "Ertiga", price: null, seating: null, ac: true, perKmprice: null },
    { type: "Innova", price: null, seating: null, ac: true, perKmprice: null },
    { type: "Crysta", price: null, seating: null, ac: true, perKmprice: null },
    { type: "Innova 7 Seater", price: null, seating: 7, ac: true, perKmprice: null },
    { type: "Crysta 7 Seater", price: null, seating: 7, ac: true, perKmprice: null },
    { type: "Tempo Traveller - Non AC", price: null, seating: null, ac: false, perKmprice: null },
    { type: "Tempo Traveller - AC", price: null, seating: null, ac: true, perKmprice: null },
];

const Createpackage = ({ onClose }) => {
    const [states, setStates] = useState([]);
    const [selectedState, setSelectedState] = useState('');
    const [selectedPricingType, setSelectedPricingType] = useState('');
    const [pricingOptions, setPricingOptions] = useState([]);
    const [packageName, setPackageName] = useState('');
    const [packageDescription, setPackageDescription] = useState('');
    const [step, setStep] = useState(1);
    const [vehicles, setVehicles] = useState(defaultVehicles);
    const [nights, setNights] = useState('');
    const [loading, setLoading] = useState(false);

    // Ensure fixed seating for Innova 7 and Crysta 7
    useEffect(() => {
        setVehicles(prevVehicles =>
            prevVehicles.map(vehicle =>
                (vehicle.type === 'Innova 7 Seater' || vehicle.type === 'Crysta 7 Seater')
                    ? { ...vehicle, seating: 7 }
                    : vehicle
            )
        );
    }, []);

    // Fetch states from Firestore
    useEffect(() => {
        const fetchStates = async () => {
            try {
                const snapshot = await getDocs(collection(db, 'transport'));
                const fetchedStates = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                // Auto-update any state missing pricing field (good for migration/initial setup)
                fetchedStates.forEach(async (state) => {
                    const stateDocRef = doc(db, 'transport', state.id);
                    // Check if 'pricing' or 'packages' fields are missing and add them
                    const updateData = {};
                    if (!state.pricing) {
                        updateData.pricing = {};
                    }
                    if (!state.packages) { // Ensure packages array exists
                        updateData.packages = [];
                    }

                    if (Object.keys(updateData).length > 0) {
                        try {
                            await updateDoc(stateDocRef, updateData);
                            console.log(`Updated missing fields for ${state.stateName}`);
                        } catch (error) {
                            console.error("Error updating state document with initial fields:", error);
                        }
                    }
                });

                setStates(fetchedStates);
            } catch (error) {
                console.error("Error fetching states:", error);
            }
        };
        fetchStates();
    }, []);

    // Update pricing options when state changes
    useEffect(() => {
        if (selectedState) {
            const stateData = states.find(state => state.stateName === selectedState);
            if (stateData?.pricing) {
                setPricingOptions(Object.keys(stateData.pricing));
            } else {
                setPricingOptions([]);
            }
        } else {
            setPricingOptions([]);
        }
    }, [selectedState, states]);

    const handleVehicleChange = (index, key, value) => {
        const updatedVehicles = [...vehicles];
        updatedVehicles[index][key] = (key === 'price' || key === 'seating' || key === 'perKmprice')
            ? parseInt(value)
            : value;
        setVehicles(updatedVehicles);
    };

    const toggleAC = (index) => {
        const updatedVehicles = [...vehicles];
        updatedVehicles[index].ac = !updatedVehicles[index].ac;
        setVehicles(updatedVehicles);
    };

    const handleSubmit = async () => {
        const stateDoc = states.find((s) => s.stateName === selectedState);
        if (!stateDoc || !selectedPricingType || (selectedPricingType === 'lumpsum' && !packageName.trim())) {
            alert("Please complete all required fields.");
            return;
        }

        setLoading(true);

        try {
            // Validate Nights for lumpsum
            if (selectedPricingType === 'lumpsum' && (!nights || isNaN(nights) || parseInt(nights) < 1)) {
                alert("Please enter a valid number of nights (at least 1).");
                setLoading(false);
                return;
            }

            const stateDocRef = doc(db, 'transport', stateDoc.id);
            const stateSnapshot = await getDoc(stateDocRef);
            const existingPackagesArray = stateSnapshot.data()?.packages || []; // Get the existing packages array

            // Check for existing package name only for 'lumpsum' type (checking the array field)
            if (selectedPricingType === 'lumpsum' && existingPackagesArray.some(pkg => pkg.name === packageName.trim())) {
                alert(`A package named "${packageName}" already exists in the package list. Please choose a different name.`);
                setLoading(false);
                return;
            }

            const isAnyVehicleInvalid = vehicles.some(vehicle => {
                const isLumpsumType = selectedPricingType === 'lumpsum';
                const isFixedSeater = vehicle.type === 'Innova 7 Seater' || vehicle.type === 'Crysta 7 Seater';

                if (isFixedSeater) {
                    return isLumpsumType ? isNaN(vehicle.price) : isNaN(vehicle.perKmprice);
                } else {
                    return isNaN(vehicle.seating) || (isLumpsumType ? isNaN(vehicle.price) : isNaN(vehicle.perKmprice));
                }
            });

            if (isAnyVehicleInvalid) {
                alert("Please ensure all vehicle seating and pricing fields are filled with valid numbers.");
                setLoading(false);
                return;
            }

            const updatedVehicles = vehicles.map(vehicle => {
                if (selectedPricingType === 'lumpsum') {
                    return {
                        type: vehicle.type,
                        price: isNaN(vehicle.price) ? null : vehicle.price,
                        seating: isNaN(vehicle.seating) ? null : vehicle.seating,
                        ac: vehicle.ac
                    };
                } else {
                    return {
                        type: vehicle.type,
                        perKmprice: isNaN(vehicle.perKmprice) ? null : vehicle.perKmprice,
                        seating: isNaN(vehicle.seating) ? null : vehicle.seating,
                        ac: vehicle.ac
                    };
                }
            });

            const newPackage = {
                id: uuidv4(),
                pricingType: selectedPricingType,
                vehicles: updatedVehicles,
                createdAt: new Date().toISOString(), // Storing as a standard ISO string
                ...(selectedPricingType === 'lumpsum' && {
                    name: packageName.trim(),
                    description: packageDescription.trim(),
                    nights: parseInt(nights),
                    days: parseInt(nights) + 1,
                }),
            };

            // --- START: Storing in BOTH subcollection and array field ---

            // 1. Store as a document in the 'packages' subcollection
            const packagesSubcollectionRef = collection(db, 'transport', stateDoc.id, 'packages');
            await setDoc(doc(packagesSubcollectionRef, newPackage.id), newPackage);
            console.log(`Package added to subcollection: ${newPackage.id}`);


            // 2. Store as an item in the 'packages' array field of the state document
            const finalPackagesArray = [...existingPackagesArray, newPackage];
            await updateDoc(stateDocRef, { packages: finalPackagesArray });
            console.log(`Package added to array field for state: ${stateDoc.stateName}`);

            // --- END: Storing in BOTH subcollection and array field ---

            alert("Package created successfully!");
            onClose();
        } catch (error) {
            console.error("Error creating package:", error);
            alert("Failed to create package. Please try again. Check console for details.");
        } finally {
            setLoading(false);
        }
    };

    return (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-xl shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-theme-primary/20">
      {/* HEADER */}
      <div className="flex justify-between items-center px-6 py-4 border-b bg-theme-muted/40">
        <h2 className="text-xl font-semibold text-theme-dark">Create Transport Package</h2>
        <button
          onClick={onClose}
          className="text-theme-primary hover:text-theme-secondary text-lg font-semibold"
        >
          ✖
        </button>
      </div>

      {/* CONTENT */}
      <div className="p-6 space-y-6">
        {/* STEP 1 */}
        {step === 1 && (
          <div className="space-y-5">
            {/* State */}
            <div>
              <label className="block text-sm font-medium text-theme-dark mb-1">
                Select State
              </label>
              <select
                className="w-full border border-theme-primary/30 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-theme-primary"
                value={selectedState}
                onChange={(e) => {
                  setSelectedState(e.target.value);
                  setSelectedPricingType('');
                  setPackageName('');
                  setPackageDescription('');
                }}
              >
                <option value="">-- Select State --</option>
                {states.map((state) => (
                  <option key={state.id} value={state.stateName}>
                    {state.stateName}
                  </option>
                ))}
              </select>
            </div>

            {/* Pricing */}
            {pricingOptions.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-theme-dark mb-1">
                  Select Pricing Type
                </label>
                <select
                  className="w-full border border-theme-primary/30 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-theme-primary"
                  value={selectedPricingType}
                  onChange={(e) => setSelectedPricingType(e.target.value)}
                >
                  <option value="">-- Select Pricing Type --</option>
                  {pricingOptions.map((option, idx) => (
                    <option key={idx} value={option}>
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Lump Sum Fields */}
            {selectedPricingType === 'lumpsum' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-theme-dark mb-1">
                    Package Name
                  </label>
                  <input
                    className="w-full border border-theme-primary/30 rounded-md px-3 py-2"
                    value={packageName}
                    onChange={(e) => setPackageName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-theme-dark mb-1">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    className="w-full border border-theme-primary/30 rounded-md px-3 py-2"
                    value={packageDescription}
                    onChange={(e) => setPackageDescription(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-theme-dark mb-1">
                    Number of Nights
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="w-full border border-theme-primary/30 rounded-md px-3 py-2"
                    value={nights}
                    onChange={(e) => setNights(e.target.value)}
                    onWheel={(e) => e.target.blur()}
                  />
                  <p className="text-xs text-theme-dark/60 mt-1">
                    Total Days: {nights ? parseInt(nights) + 1 : '-'}
                  </p>
                </div>
              </div>
            )}

            {/* Next Button */}
            {selectedPricingType && (
              <button
                onClick={() => setStep(2)}
                className="bg-theme-primary hover:bg-theme-secondary text-white py-2 px-6 rounded-lg font-medium w-full"
              >
                Next ➡
              </button>
            )}
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="space-y-5">
            <h3 className="font-semibold text-theme-dark">
              Customize Vehicle Pricing
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full border border-theme-primary/20 rounded-lg overflow-hidden text-sm">
                <thead className="bg-theme-primary text-white">
                  <tr>
                    <th className="px-3 py-2">Vehicle</th>
                    <th className="px-3 py-2">Seating</th>
                    <th className="px-3 py-2">AC</th>
                    <th className="px-3 py-2">
                      {selectedPricingType === 'lumpsum'
                        ? 'Price'
                        : 'Per Km Price'}
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {vehicles.map((v, i) => {
                    const fixed = ['Innova 7 Seater', 'Crysta 7 Seater'].includes(
                      v.type
                    );
                    const lump = selectedPricingType === 'lumpsum';

                    return (
                      <tr key={i} className="border-b last:border-none">
                        <td className="px-3 py-2">{v.type}</td>

                        <td className="px-3 py-2">
                          {fixed ? (
                            <input
                              readOnly
                              className="w-full border rounded px-2 py-1 bg-gray-50"
                              value="7"
                            />
                          ) : (
                            <input
                              type="number"
                              className="w-full border rounded px-2 py-1"
                              value={v.seating ?? ''}
                              onChange={(e) =>
                                handleVehicleChange(i, 'seating', e.target.value)
                              }
                            />
                          )}
                        </td>

                        <td className="px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={v.ac}
                            onChange={() => toggleAC(i)}
                            className="h-4 w-4 accent-theme-primary"
                          />
                        </td>

                        <td className="px-3 py-2">
                          <input
                            type="number"
                            className="w-full border rounded px-2 py-1"
                            value={
                              lump ? v.price ?? '' : v.perKmprice ?? ''
                            }
                            onChange={(e) =>
                              handleVehicleChange(
                                i,
                                lump ? 'price' : 'perKmprice',
                                e.target.value
                              )
                            }
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Buttons */}
            <div className="flex justify-between gap-3">
              <button
                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-theme-dark"
                onClick={() => setStep(1)}
              >
                ⬅ Back
              </button>

              <button
                disabled={loading}
                onClick={handleSubmit}
                className="bg-theme-primary hover:bg-theme-secondary text-white px-6 py-2 rounded font-medium disabled:opacity-60"
              >
                {loading ? 'Saving...' : 'Save Package'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
);
};

export default Createpackage;