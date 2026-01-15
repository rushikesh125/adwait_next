"use client"
import React, { useState } from "react";

const MarkupSection = ({ grandTotal, setMarkupAmount }) => {
  const [showOptions, setShowOptions] = useState(false);
  const [type, setType] = useState("");
  const [value, setValue] = useState("");

  const handleMarkupChange = (selectedType) => {
    setType(selectedType);
    setValue("");
  };

  const calculateMarkup = () => {
    let markup = 0;
    if (type === "lumpsum") {
      markup = parseFloat(value || 0);
    } else if (type === "percentage") {
      markup = (parseFloat(value || 0) / 100) * grandTotal;
    }
    setMarkupAmount(markup);
  };

  return (
    <div className="markup-section">
      <button className="add-markup-btn" onClick={() => setShowOptions(!showOptions)}>
        {showOptions ? "Hide Markup" : "Add Markup"}
      </button>

      {showOptions && (
        <div className="markup-options">
          <select onChange={(e) => handleMarkupChange(e.target.value)} value={type}>
            <option value="">Select Markup Type</option>
            <option value="lumpsum">Lumpsum Rate</option>
            <option value="percentage">Percentage Rate</option>
          </select>

          {type && (
            <input
              type="number"
              placeholder={type === "lumpsum" ? "Enter amount (₹)" : "Enter % commission"}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onBlur={calculateMarkup}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default MarkupSection;
