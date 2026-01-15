import React, { useEffect, useState } from "react";
import { collection, getDocs, addDoc, serverTimestamp, doc } from "firebase/firestore";
import "@/components/css/create_new_package.css";
import HotelRoomSelector from "./HotelRoomSelector";
import SelectTransport from "./TransportSelector";
import SelectActivities from "./SelectActivities";
import jsPDF from "jspdf";
import autoTable from 'jspdf-autotable';
import "jspdf-autotable";


// Import your logo image

import { db } from "@/firebase/config";
import { useSelector } from "react-redux";

const Create_new_package = ({
  user,
  userData,
  checkInDate,
  setCheckInDate,
  saveChanges,
  setSaveChanges,
  checkOutDate,
  setCheckOutDate,
}) => {
  const [addedHotels, setAddedHotels] = useState([]);
  const [packages, setPackages] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [states, setStates] = useState([]);
  const [selectedStateId, setSelectedStateId] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [nights, setNights] = useState(1);
  const [selectedRoomCategory, setSelectedRoomCategory] = useState(null);
  const [selectedMealPlan, setSelectedMealPlan] = useState("");
  const [applicableSeason, setApplicableSeason] = useState(null);
  const [numDouble, setNumDouble] = useState([0]);
  const [numExtraAdult, setNumExtraAdult] = useState([0]);
  const [numExtraChild, setNumExtraChild] = useState([0]);
  const [hotelTotal, setHotelTotal] = useState([0]);
  const [hotelEntries, setHotelEntries] = useState([]);
  const [isReadyToAddAnother, setIsReadyToAddAnother] = useState(false);
  const [showTransportSection, setShowTransportSection] = useState(false);
  const [selectedTransport, setSelectedTransport] = useState(null);
  const [showActivitiesSection, setShowActivitiesSection] = useState(false);
  const [selectedActivities, setSelectedActivities] = useState([]);
  const [activityTotalPrice, setActivityTotalPrice] = useState(0);
  const [activityPricingType, setActivityPricingType] = useState("fit");
  const [markupAmount, setMarkupAmount] = useState(0);
  const [confirmedMarkup, setConfirmedMarkup] = useState(0);
  const [markupType, setMarkupType] = useState("lumpsum");
  const [editingIndex, setEditingIndex] = useState(null); // New state to track which hotel entry is being edited
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [packageName, setPackageName] = useState("");
  const [customerName, setCustomerName] = useState("");
  // const agentRef = doc(db, "saved_packages_by_agents", agentId);
  // const packagesCollectionRef = collection(agentRef, "packages");


  useEffect(() => {
    // Fetches hotel data from Firestore
    const fetchHotels = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "hotels"));
        const hotelList = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            rooms: data.rooms || [],
          };
        });

        // Filters out duplicate hotels based on name, state, and city
        const uniqueHotelsMap = new Map();
        const uniqueHotels = hotelList.filter((hotel) => {
          const key = `${hotel.name.toLowerCase()}-${hotel.state.toLowerCase()}-${hotel.city.toLowerCase()}`;
          if (!uniqueHotelsMap.has(key)) {
            uniqueHotelsMap.set(key, true);
            return true;
          }
          return false;
        });

        setHotels(uniqueHotels);
      } catch (error) {
        console.error("Error fetching hotels:", error);
      }
    };

    // Fetches state data from Firestore
    const fetchStates = async () => {
      const querySnapshot = await getDocs(collection(db, "locations"));
      const stateList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setStates(stateList);
    };

    fetchHotels();
    fetchStates();
  }, []);

  useEffect(() => {
    // Calculates checkout date based on check-in date and number of nights
    if (checkInDate && nights) {
      const inDate = new Date(checkInDate);
      if (!isNaN(inDate)) {
        const outDate = new Date(inDate);
        outDate.setDate(inDate.getDate() + parseInt(nights));
        setCheckOutDate(outDate.toISOString().split("T")[0]);
      }
    }
  }, [checkInDate, nights, setCheckOutDate]);

  // Filters hotels based on the selected state
  const filteredHotels = hotels.filter(
    (hotel) => hotel.state.toLowerCase() === selectedState.toLowerCase()
  );

  // Groups filtered hotels by city
  const groupedHotels = filteredHotels.reduce((acc, hotel) => {
    const city = hotel.city;
    if (!acc[city]) acc[city] = [];
    acc[city].push(hotel);
    return acc;
  }, {});

  // Callback function for when activities are selected and finalized
  const handleActivitiesDone = (activities, totalPrice) => {
    setSelectedActivities(activities);
    setActivityTotalPrice(totalPrice);
  };

  // Handles deletion of a hotel entry from the saved list
  const handleDeleteHotel = (indexToDelete) => {
    setHotelEntries((prevEntries) =>
      prevEntries.filter((_, index) => index !== indexToDelete)
    );
  };
  const handleStateChange = async (e) => {
    let stateId = e.target.value;
    setSelectedStateId(stateId);
    setPackages([]);
    console.log("State ID:", stateId);
    if (stateId) {
      stateId = stateId.toLowerCase().replace(/ /g, "-");
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
        console.log("Packages:", list);
        setPackages(list);
      } catch (error) {
        console.error("Error fetching packages:", error);
      }
    }
  };

  // Handles editing of a hotel entry from the saved list
  const handleEditHotel = (indexToEdit) => {
    const entryToEdit = hotelEntries[indexToEdit];

    // Populate the main form fields with the data of the entry to be edited
    setCheckInDate(entryToEdit.checkInDate);
    setNights(entryToEdit.nights);
    setCheckOutDate(entryToEdit.checkOutDate);
    setSelectedState(entryToEdit.state);

    // Find the full hotel object by name, city, state to set selectedHotel ID
    const hotelObj = hotels.find(h =>
      h.name === entryToEdit.hotel &&
      h.city === entryToEdit.city &&
      h.state === entryToEdit.state
    );
    setSelectedHotel(hotelObj ? hotelObj.id : null); // Set the selected hotel ID for the radio button

    setNumDouble([entryToEdit.numDouble]);
    setNumExtraAdult([entryToEdit.numExtraAdult]);
    setNumExtraChild([entryToEdit.numExtraChild]);
    setHotelTotal([entryToEdit.hotelTotal]);
    setSelectedMealPlan(entryToEdit.selectedMealPlan);
    setSelectedRoomCategory(entryToEdit.selectedRoomCategory);

    setEditingIndex(indexToEdit); // Store the index of the entry being edited
    setSaveChanges(false); // Reset saveChanges, as we are now editing
    setIsReadyToAddAnother(false); // Hide "Add Another Hotel" during edit process
  };


  // Formats date string to a more readable format
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    if (isNaN(date)) return "Invalid Date";
    const options = { day: "2-digit", month: "short", year: "numeric" };
    return date.toLocaleDateString("en-GB", options).replace(/ /g, "-");
  };

  // Calculates total price for all hotels
  const calculateHotelTotalPriceForAllNights = (hotelEntries) => {
    if (!Array.isArray(hotelEntries) || hotelEntries.length === 0) {
      console.warn("No hotel entries provided or input is not an array.");
      return []; // Return an empty array or handle as appropriate
    }

    const updatedHotelEntries = hotelEntries.map(hotel => {
      // Ensure hotelTotal and nights are numbers.
      // Use parseFloat or parseInt as needed, and provide a fallback of 0.
      const perNightCost = parseFloat(hotel.hotelTotal) || 0;
      const numberOfNights = parseInt(hotel.nights) || 0;

      // Calculate the total price for all nights
      const totalPriceForAllNights = perNightCost * numberOfNights;

      return {
        ...hotel, // Keep all existing properties of the hotel object
        hotelTotal: totalPriceForAllNights // Add the new calculated total
      };
    });
    return updatedHotelEntries;
  }
  const hotelTotalPrice = hotelEntries.reduce(
    (acc, entry) => acc + entry.nights * entry.hotelTotal,
    0
  );
  // Calculates total transport price
  const transportTotalPrice = selectedTransport?.selectedVehicle?.price
    ? Number(selectedTransport.selectedVehicle.price)
    : 0;
  // Calculates the grand total including hotels, transport, activities, and markup
  const grandTotal =
    hotelTotalPrice + transportTotalPrice + activityTotalPrice + confirmedMarkup;

  // Function to calculate total meals across all hotels
  const calculateTotalMeals = (hotelEntriesData) => { // Accepts hotelEntriesData
    let totalBreakfasts = 0;
    let totalLunches = 0;
    let totalDinners = 0;

    hotelEntriesData.forEach(entry => {
      const mealPlan = entry.selectedMealPlan?.toUpperCase() || "EP"; // Default to EP if not specified
      const nightsAsString = entry.nights;
      const nightsAsNumber = parseInt(nightsAsString, 10); // Convert to number here

      console.log(`[MealCalc Debug] Processing hotel: ${entry.hotel}, Nights (string from entry): '${nightsAsString}', Nights (parsed number): ${nightsAsNumber}, Meal Plan: ${mealPlan}`);

      if (isNaN(nightsAsNumber) || nightsAsNumber < 0) {
        console.error(`[MealCalc Error] Invalid or negative number of nights for hotel ${entry.hotel}. Nights value: '${nightsAsString}'. Skipping this hotel's meal calculation.`);
        return; // Skip this entry
      }

      switch (mealPlan) {
        case "CP":
          totalBreakfasts += nightsAsNumber;
          break;
        case "MAP":
          totalBreakfasts += nightsAsNumber;
          totalDinners += nightsAsNumber;
          break;
        case "AP":
          totalBreakfasts += nightsAsNumber;
          totalLunches += nightsAsNumber;
          totalDinners += nightsAsNumber;
          break;
        case "EP":
          // No meals included
          break;
        default:
          console.warn(`[MealCalc Warning] Unknown meal plan for hotel ${entry.hotel}: ${mealPlan}. No meals added for this entry.`);
          break;
      }
    });
    console.log(`[MealCalc Debug] Final calculated meals: Breakfasts: ${totalBreakfasts}, Lunches: ${totalLunches}, Dinners: ${totalDinners}`);

    return { totalBreakfasts, totalLunches, totalDinners };
  };

  // Function to generate the package summary string for clipboard
  const generatePackageSummary = (quotationData, allHotelsData) => {
    if (!quotationData || !quotationData.hotelSummary || quotationData.hotelSummary.length === 0) {
      return "Hotel details not available.";
    }

    const firstEntry = quotationData.hotelSummary[0]; // Used for common details like guest info and start date
    const formatDateForSummary = (dateStr) => { // Use a local helper for consistency
      const date = new Date(dateStr);
      if (isNaN(date)) return "Invalid Date";
      const options = { day: "2-digit", month: "short", year: "numeric" };
      return date.toLocaleDateString("en-GB", options).replace(/ /g, "-");
    };


    let summary = "";

    // ✉️ Greeting
    summary += `Dear Guests,\n\n`;
    summary += `Greetings from Adwait Tours!!\n`;
    summary += `Kindly find the best possible rates for your requirement starting ${formatDateForSummary(firstEntry.checkInDate)}\n`;

    // 🧍 Guest Info (using first hotel's guest count as an example, ideally this would be a separate input)
    summary += `${firstEntry.numDouble || 0} Couple\n`;
    summary += `${firstEntry.numExtraChild || 0} Extra Child\n`;
    summary += `${firstEntry.numExtraAdult || 0} Extra Adult\n\n`;

    // 🏨 Hotels Section
    summary += ` *HOTELS*\n`;
    quotationData.hotelSummary.forEach((entry, index) => {
      // Find the full hotel data from allHotelsData to get GoogleListingURL
      const hotelFullDetails = allHotelsData.find(h =>
        h.name === entry.hotel &&
        h.city === entry.city &&
        h.state === entry.state
      );

      const hotelCheckIn = formatDateForSummary(entry.checkInDate);
      const hotelCheckOut = formatDateForSummary(entry.checkOutDate);

      const hotelNights = entry.nights;
      const mealPlan = entry.selectedMealPlan?.toUpperCase() || "MEAL PLAN";
      const mealPlanDescriptions = {
        "EP": "Accommodation only",
        "CP": "Breakfast Only",
        "MAP": "Breakfast and Dinner",
        "AP": "Breakfast, Lunch and Dinner"
      };
      const roomCategory = entry.selectedRoomCategory?.toUpperCase() || "ROOM CATEGORY NOT SELECTED";
      const roomCount = entry.numDouble || 0;

      summary += `${index + 1}. ${entry.hotel.toUpperCase()} ${hotelFullDetails?.GoogleListingURL || ''}\n`;
      summary += ` ⇒ ${entry.city}, ${entry.state}\n`;
      summary += ` ⇒ Hotel Room Count: ${roomCount} Hotel Room Category: ${roomCategory}\n`;
      summary += ` ⇒ ${hotelCheckIn} to ${hotelCheckOut} (${hotelNights} Nights, ${mealPlanDescriptions[mealPlan]})\n\n`;
    });

    // Recalculate meals based on the passed quotationData
    const { totalBreakfasts, totalLunches, totalDinners } = calculateTotalMeals(quotationData.hotelSummary);


    // Cost
    summary += `*TOTAL TOUR COST = ₹${quotationData.grandTotal.toFixed()}/-*\n\n`;

    // INCLUDED - Now based on aggregated meal plans from ALL hotels
    summary += `*INCLUDED*\n`;

    if (totalBreakfasts > 0) {
      summary += `✅ ${totalBreakfasts} Breakfast(s)\n`;
    }
    if (totalLunches > 0) {
      summary += `✅ ${totalLunches} Lunch(es)\n`;
    }
    if (totalDinners > 0) {
      summary += `✅ ${totalDinners} Dinner(s)\n`;
    }
    if (totalBreakfasts === 0 && totalLunches === 0 && totalDinners === 0) {
      summary += `✅ No meals included (EP Plan for all hotels or unspecified)\n`;
    }

    // ✅ Transport (optional)
    if (quotationData.transportSummary?.selectedVehicle) { // Use selectedVehicle from quotationData
      const vehicle = quotationData.transportSummary.selectedVehicle;
      const acStatus = vehicle.ac ? "AC" : "Non AC"; // assuming ac is a boolean
      summary += `✅ ${vehicle.name || vehicle.type} ${acStatus} for all sightseeing and transfer as per itinerary\n`;
      summary += `✅ Toll, Parking, Driver Allowance, Permits\n`;
    }

    // ✅ Activities
    quotationData.activitySummary?.forEach((activity) => {
      summary += `✅ ${activity.name.toUpperCase()} (${activity.city}) - ${activity.participants} Person\n`;
    });

    // ❌ Excluded
    summary += `\n*EXCLUDED*\n`;
    summary += `❌ Train / Flight Fare\n`;
    summary += `❌ Early check in and late check out as per hotel policy\n`;
    summary += `❌ Medical, Emergency, Entry Tickets, activities, expenses\n`;
    summary += `❌ Anything not mentioned in included\n`;

    return summary;
  };

  // Copies the generated package summary to the clipboard
  const handleCopyToClipboard = () => {
    // Create a package data object from the current state for summary generation
    const currentPackageData = {
      hotelSummary: hotelEntries,
      transportSummary: selectedTransport,
      activitySummary: selectedActivities,
      grandTotal: grandTotal,
      markup: confirmedMarkup,
      // Add other relevant top-level data if needed for the summary
      customerName: customerName,
      packageName: packageName
    };

    const summary = generatePackageSummary(currentPackageData, hotels); // Pass the current state and allHotels
    let isCopySuccessful = false;

    // Create a temporary textarea element
    const textarea = document.createElement('textarea');
    textarea.value = summary;

    // Make the textarea invisible and append it to the body
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '-9999px';
    document.body.appendChild(textarea);

    try {
      // Select the text in the textarea
      textarea.select();
      // For mobile devices, use setSelectionRange
      textarea.setSelectionRange(0, textarea.value.length);

      // Execute the copy command
      isCopySuccessful = document.execCommand('copy');
      if (!isCopySuccessful) {
        console.error("document.execCommand('copy') failed.");
        // Fallback for cases where execCommand fails (e.g., modern browsers prefer Clipboard API)
        // Note: navigator.clipboard.writeText is less likely to work in some iframes without explicit permissions
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(summary)
            .then(() => {
              displayMessageBox('Package summary copied to clipboard!', 'success');
            })
            .catch((err) => {
              displayMessageBox('Failed to copy to clipboard: ' + err, 'error');
              console.error('Failed to copy using navigator.clipboard.writeText:', err);
            });
          return; // Exit as async copy is handled
        }
      }
    } catch (err) {
      console.error('Error attempting to copy to clipboard:', err);
      isCopySuccessful = false;
    } finally {
      // Remove the temporary textarea
      document.body.removeChild(textarea);
    }

    // Display message box based on sync copy result
    if (isCopySuccessful) {
      displayMessageBox('Package summary copied to clipboard!', 'success');
    } else {
      // If both execCommand and navigator.clipboard failed or weren't used
      displayMessageBox('Failed to copy to clipboard. Your browser might not support this feature directly in this context.', 'error');
    }
  };

  // Helper function to display the custom message box
  const displayMessageBox = (message, type) => {
    const messageBox = document.createElement('div');
    messageBox.className = `message-box ${type}`;
    messageBox.textContent = message;
    document.body.appendChild(messageBox);

    // Remove the message box after a few seconds
    setTimeout(() => {
      if (document.body.contains(messageBox)) { // Check if it still exists before removing
        document.body.removeChild(messageBox);
      }
    }, 3000); // Display for 3 seconds
  };


  // Exports the package summary as a PDF
  const handleExportToPDF = () => {
    // --- Defensive Check ---
    if (!hotelEntries || hotelEntries.length === 0) {
      alert("Cannot generate PDF: Please add at least one hotel to the package.");
      return;
    }

    const doc = new jsPDF();
    const BRAND_COLOR_BLUE = '#0D47A1';
    const HEADER_TEXT_COLOR = '#444444';
    const FONT_SIZE_NORMAL = 9;
    const FONT_SIZE_SMALL = 8;
    const pageContentWidth = 180; // Usable width between margins (210 - 15*2 = 180)

    const img = new Image();
    img.src = "./await-logo.jpg";

    img.onload = () => {
      const addHeader = () => {
        const logoY = 10;
        const companyNameY = logoY + 8;
        const sloganY = companyNameY + 7;

        const logoWidth = 40;
        const logoHeight = (img.height * logoWidth) / img.width;
        doc.addImage(img, 'PNG', 15, logoY, logoWidth, logoHeight);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(BRAND_COLOR_BLUE);
        doc.text("Adwait Tours", 60, companyNameY);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(HEADER_TEXT_COLOR);
        doc.text("Travel Package Quotation", 60, sloganY);

        doc.setFontSize(FONT_SIZE_SMALL); // 8pt
        doc.setTextColor(HEADER_TEXT_COLOR);

        const contactBlockX = 160;
        let contactLineY = logoY + 4;

        const phoneNumber = "+91 9884798483";
        const phoneLink = `tel:${phoneNumber.replace(/ /g, '')}`;
        const phoneText = `Phone: ${phoneNumber}`;

        const phoneTextWidth = doc.getStringUnitWidth(phoneText) * FONT_SIZE_SMALL / doc.internal.scaleFactor;
        const phoneTextHeight = FONT_SIZE_SMALL / doc.internal.scaleFactor * 1.15;

        doc.text(phoneText, contactBlockX, contactLineY, { align: 'left' });
        doc.link(contactBlockX - phoneTextWidth, contactLineY - phoneTextHeight + 1, phoneTextWidth, phoneTextHeight, { url: phoneLink });

        contactLineY += 5;
        const emailAddress = "sales@adwaittours.com";
        const emailLink = `mailto:${emailAddress}`;
        const emailText = `Email: ${emailAddress}`;
        const emailTextWidth = doc.getStringUnitWidth(emailText) * FONT_SIZE_SMALL / doc.internal.scaleFactor;

        doc.text(emailText, contactBlockX, contactLineY, { align: 'left' });
        doc.link(contactBlockX - emailTextWidth, contactLineY - phoneTextHeight + 1, emailTextWidth, phoneTextHeight, { url: emailLink });

        contactLineY += 5;
        const webAddress = "www.adwaittours.com";
        const webLink = `https://${webAddress}`;
        const webText = `Web: ${webAddress}`;
        const webTextWidth = doc.getStringUnitWidth(webText) * FONT_SIZE_SMALL / doc.internal.scaleFactor;

        doc.text(webText, contactBlockX, contactLineY, { align: 'left' });
        doc.link(contactBlockX - webTextWidth, contactLineY - phoneTextHeight + 1, webTextWidth, phoneTextHeight, { url: webLink });

        const finalHeaderBottomY = Math.max(logoY + logoHeight, sloganY, contactLineY) + 5;
        doc.setDrawColor('#CCCCCC');
        doc.setLineWidth(0.2);
        doc.line(15, finalHeaderBottomY, 200, finalHeaderBottomY);
      };

      const addFooter = () => {
        doc.setDrawColor('#CCCCCC');
        doc.setLineWidth(0.2);
        doc.line(15, 282, 200, 282);
        doc.setFontSize(FONT_SIZE_SMALL);
        doc.setTextColor(HEADER_TEXT_COLOR);
        doc.text('Thank you for choosing Adwait Tours!', 107, 287, { align: 'center' });
        doc.text('For Reviews: Google Page | Follow Us:  Instagram', 107, 291, { align: 'center' });
      };

      addHeader();
      let currentY = 32;
      currentY += 10;

      // Create a quotation data object from the current state for PDF generation
      const currentQuotationDataForPdf = {
        hotelSummary: hotelEntries,
        transportSummary: selectedTransport,
        activitySummary: selectedActivities,
        grandTotal: grandTotal,
        markup: confirmedMarkup,
        customerName: customerName,
        packageName: packageName,
      };

      // Helper function for PDF date formatting (re-defined here for self-containment for PDF generation)
      const formatPdfDateInternal = (dateStr) => {
        const date = new Date(dateStr);
        if (isNaN(date)) return "Invalid Date";
        const options = { day: "2-digit", month: "short", year: "numeric" };
        return date.toLocaleDateString("en-GB", options);
      };

      const MealPlans = { "EP": "Accommodation only", "CP": "Breakfast only", "MAP": "Breakfast and Dinner", "AP": "Breakfast, lunch, and dinner" };

      // GUEST INFO TABLE
      const firstHotelPdf = currentQuotationDataForPdf.hotelSummary[0];
      autoTable(doc, {
        startY: currentY,
        body: [
          ['Customer Name:', currentQuotationDataForPdf.customerName || 'N/A', 'Date:', formatPdfDateInternal(new Date().toISOString())],
          ['Package Name:', currentQuotationDataForPdf.packageName || 'N/A', 'Guests:', `${firstHotelPdf.numDouble || 0} Couple(s), ${firstHotelPdf.numExtraAdult || 0} Adult(s), ${firstHotelPdf.numExtraChild || 0} Child(ren)`]
        ],
        theme: 'plain',
        styles: { fontSize: FONT_SIZE_NORMAL },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 35 },
          1: { cellWidth: 'auto' },
          2: { fontStyle: 'bold', cellWidth: 35 },
          3: { cellWidth: 'auto' }
        },
        margin: { left: 15, right: 15 }
      });
      currentY = doc.lastAutoTable.finalY;

      // HOTEL DETAILS TABLE
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Hotel Details', 15, currentY + 10);
      currentY += 12;

      autoTable(doc, {
        startY: currentY + 5,
        head: [['Hotel Name', 'City', 'Room Type', 'Dates', 'Nights', 'Meal Plan']],
        body: currentQuotationDataForPdf.hotelSummary.map(h => {
          const fullHotelData = hotels.find(hotel =>
            hotel.name === h.hotel &&
            hotel.city === h.city &&
            hotel.state === h.state
          );
          return [
            { content: h.hotel, _fullData: fullHotelData },
            h.city,
            h.selectedRoomCategory,
            `${formatPdfDateInternal(h.checkInDate)} - ${formatPdfDateInternal(h.checkOutDate)}`,
            h.nights,
            MealPlans[h.selectedMealPlan] || h.selectedMealPlan,
          ];
        }),
        theme: 'grid',
        headStyles: { fillColor: BRAND_COLOR_BLUE },
        styles: { fontSize: FONT_SIZE_NORMAL, cellPadding: 2 },
        margin: { left: 15, right: 15 },
        didDrawPage: (data) => { addHeader(); },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 0) {
            const fullHotelData = data.cell.raw?._fullData;
            if (fullHotelData && fullHotelData.GoogleListingURL) {
              data.cell.styles.textColor = [0, 0, 255];
            }
          }
        },
        didDrawCell: (data) => {
          if (data.section === 'body' && data.column.index === 0) {
            const fullHotelData = data.cell.raw?._fullData;
            if (fullHotelData && fullHotelData.GoogleListingURL) {
              doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url: fullHotelData.GoogleListingURL });
            }
          }
        }
      });
      currentY = doc.lastAutoTable.finalY;
      // Grand Total Summary
      autoTable(doc, {
        startY: currentY + 10,
        body: [
          [{ content: 'Grand Total Tour Cost:', styles: { halign: 'left', fontStyle: 'bold', textColor: BRAND_COLOR_BLUE } },
          { content: `Rs. ${currentQuotationDataForPdf.grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}/-`, styles: { halign: 'right', fontStyle: 'bold', textColor: BRAND_COLOR_BLUE } }]
        ],
        theme: 'grid',
        styles: { fontSize: FONT_SIZE_NORMAL + 2, cellPadding: 3 },
        columnStyles: { 0: { cellWidth: 120 }, 1: { cellWidth: 'auto' } },
        margin: { left: 15, right: 15 },
        didDrawPage: (data) => { addHeader(); }
      });
      currentY = doc.lastAutoTable.finalY;

      // INCLUDED / EXCLUDED
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Inclusions & Exclusions', 15, currentY + 10);
      currentY += 12;
      const columnWidth = pageContentWidth / 2 - 5;

      const includedItems = [
        '• Hotel accommodation as specified.',
      ];

      // Calculate meals for PDF inclusion list
      const { totalBreakfasts, totalLunches, totalDinners } = calculateTotalMeals(currentQuotationDataForPdf.hotelSummary);

      if (totalBreakfasts > 0) includedItems.push(`• ${totalBreakfasts} Breakfast(s)`);
      if (totalLunches > 0) includedItems.push(`• ${totalLunches} Lunch(es)`);
      if (totalDinners > 0) includedItems.push(`• ${totalDinners} Dinner(s)`);
      if (totalBreakfasts === 0 && totalLunches === 0 && totalDinners === 0 && currentQuotationDataForPdf.hotelSummary.length > 0) {
        includedItems.push('• No meals included (EP Plan for all hotels or unspecified)');
      }

      if (currentQuotationDataForPdf.transportSummary?.selectedVehicle) {
        includedItems.push('• All transfers and sightseeing by private ' + currentQuotationDataForPdf.transportSummary.selectedVehicle.type + (currentQuotationDataForPdf.transportSummary.selectedVehicle.ac ? ' (AC)' : '') + ' vehicle.');
        includedItems.push('• Toll, parking fees, driver allowance, and permits.');
      }

      if (currentQuotationDataForPdf.activitySummary && currentQuotationDataForPdf.activitySummary.length > 0) {
        for (const activity of currentQuotationDataForPdf.activitySummary) {
          includedItems.push(`• ${activity.name} for ${activity.participants} participants.`);
        }
      }

      const excludedItems = [
        '• Train / Flight Fare.',
        '• Early check-in & late check-out as per hotel policy.',
        '• Any items not mentioned in the "Included" section.'
      ];

      const wrappedIncluded = includedItems.map(item => doc.splitTextToSize(item, columnWidth));
      const wrappedExcluded = excludedItems.map(item => doc.splitTextToSize(item, columnWidth));

      const body = [];
      const maxLength = Math.max(wrappedIncluded.length, wrappedExcluded.length);
      for (let i = 0; i < maxLength; i++) {
        body.push([wrappedIncluded[i] || '', wrappedExcluded[i] || '']);
      }

      autoTable(doc, {
        startY: currentY + 5,
        head: [['INCLUDED', 'EXCLUDED']],
        body: body,
        headStyles: { fillColor: BRAND_COLOR_BLUE, halign: 'center' },
        theme: 'grid',
        styles: { fontSize: FONT_SIZE_NORMAL, cellPadding: 2 },
        margin: { left: 15, right: 15 },
        didDrawPage: (data) => { addHeader(); }
      });
      currentY = doc.lastAutoTable.finalY;

      addFooter();
      doc.save(`Travel_Package_Quotation.pdf`);
    };

    img.onerror = () => alert("Failed to generate PDF: Could not load company logo.");
  };
  // Function to save the package data to Firestore
  const handleSavePackage = async () => {
    if (!packageName.trim()) return alert("Please enter a package name.");
    if (!customerName.trim()) return alert("Please enter a customer name.");

    try {
      const {user} = useSelector(state=>state.auth);
      const agentId = user?.uid;
      if (!agentId) throw new Error("Agent not logged in");

      const agentRef = doc(db, "saved_packages_by_agents", agentId);
      const packagesCollectionRef = collection(agentRef, "packages");

      const packageData = {
        packageName,
        customerName,
        status: "Draft",
        createdAt: serverTimestamp(),
        markup: confirmedMarkup || 0,
        grandTotal: grandTotal || 0,
      };

      if (hotelEntries && hotelEntries.length > 0) {
        let updatedHotelEntries = calculateHotelTotalPriceForAllNights(hotelEntries);
        packageData.hotelSummary = updatedHotelEntries;

      }

      if (selectedActivities && selectedActivities.length > 0) {
        packageData.activitySummary = selectedActivities;
      }

      if (selectedTransport) {
        const vehicle = selectedTransport.selectedVehicle;
        packageData.transportSummary = {
          vehicles: selectedTransport.vehicles || [],
          allPkgs: selectedTransport.allPkgs || [],
          packageName: selectedTransport.name || "Custom",
          vehicleName: selectedTransport.selectedVehicle?.type || "",
          seats: selectedTransport.selectedVehicle?.seating || "",
          price: selectedTransport.selectedVehicle?.price || 0,
          ac: selectedTransport.selectedVehicle?.ac || false,
          isCustom: vehicle?.isCustom || false,
          perKmprice: vehicle?.perKmprice || 0
        };
      }


      await addDoc(packagesCollectionRef, packageData);

      alert("Package saved successfully!");
      setShowSaveModal(false);
      setPackageName("");
      setCustomerName("");
    } catch (err) {
      console.error("Error saving package:", err);
      alert("Failed to save package: " + err.message);
    }
  };

  return (
    <div className="create_new_package">
      <div className="package-header">
      </div>

      <div className="date-inputs">
        <div className="date-field">
          <label htmlFor="checkInDate">Check-in Date:</label>
          <input
            id="checkInDate"
            type="date"
            value={checkInDate}
            min={new Date().toISOString().split("T")[0]}
            onChange={(e) => setCheckInDate(e.target.value)}
          />
        </div>

        <div className="date-field">
          <label htmlFor="nights">Number of Nights:</label>
          <input
            id="nights"
            type="number"
            min={1}
            value={nights}
            onChange={(e) => setNights(e.target.value)}
          />
        </div>

        <div className="date-field">
          <label htmlFor="checkOutDate">Check-out Date:</label>
          <input
            id="checkOutDate"
            type="date"
            value={checkOutDate}
            min={checkInDate}
            readOnly
          />
        </div>
      </div>

      <div className="state-select">
        <label htmlFor="stateSelect">Select State:</label>
        <select
          id="stateSelect"
          value={selectedState}
          onChange={(e) => {
            setSelectedState(e.target.value);
            setSelectedHotel(null); // Reset hotel selection when state changes
            setEditingIndex(null); // Reset editing state
            handleStateChange(e);
          }}
        >
          <option value="">-- Select a State --</option>
          {states.map((state) => (
            <option key={state.id} value={state.name}>
              {state.name}
            </option>
          ))}
        </select>
      </div>

      {selectedState && (
        <div className="hotel-select">
          <h3>Hotels in {selectedState}</h3>
          <div className="hotel-list">
            {Object.keys(groupedHotels).map((city) => (
              <div key={city} className="hotel-group">
                <h4>{city}</h4>
                {groupedHotels[city].map((hotel) => (
                  <div key={hotel.id} className="hotel-item">
                    <input
                      type="radio"
                      name="hotel"
                      id={`hotel-${hotel.id}`}
                      value={hotel.id}
                      checked={selectedHotel === hotel.id}
                      onChange={() => setSelectedHotel(hotel.id)}
                    />
                    <label htmlFor={`hotel-${hotel.id}`}>
                      {hotel.name}, {hotel.city}, {hotel.state} ({hotel.GoogleReviewRating ? ` Rating - ${hotel.GoogleReviewRating}` : "Rating not available"})
                    </label>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedHotel ? (
        <>
          {/* Hotel Room Selection Component */}
          <HotelRoomSelector
            hotel={hotels.find((h) => h.id === selectedHotel)}
            checkInDate={checkInDate}
            numDouble={numDouble}
            setNumDouble={setNumDouble}
            numExtraAdult={numExtraAdult}
            setNumExtraAdult={setNumExtraAdult}
            numExtraChild={numExtraChild}
            setNumExtraChild={setNumExtraChild}
            hotelTotal={hotelTotal}
            setHotelTotal={setHotelTotal}
            setSelectedMealPlan={setSelectedMealPlan}
            selectedMealPlan={selectedMealPlan}
            setSelectedRoomCategory={setSelectedRoomCategory}
            selectedRoomCategory={selectedRoomCategory}
          />

          <div className="save-changes-container">
            {/* Save/Update Hotel Button */}
            <button
              className="save-button"
              onClick={() => {

                const selectedHotelFullData = hotels.find((h) => h.id === selectedHotel);
                const currentHotelData = {
                  checkInDate,
                  nights,
                  checkOutDate,
                  state: selectedState,
                  hotel: selectedHotelFullData?.name || "N/A",
                  city: selectedHotelFullData?.city || "N/A",
                  GoogleListingURL: selectedHotelFullData?.GoogleListingURL || null,
                  numDouble: numDouble[0],
                  numExtraAdult: numExtraAdult[0],
                  numExtraChild: numExtraChild[0],
                  hotelTotal: hotelTotal[0],
                  selectedMealPlan: selectedMealPlan,
                  selectedRoomCategory: selectedRoomCategory,
                };

                setHotelEntries((prevEntries) => {
                  if (editingIndex !== null) {
                    // If editing, update the existing entry
                    const updatedEntries = [...prevEntries];
                    updatedEntries[editingIndex] = currentHotelData;
                    return updatedEntries;
                  } else {
                    // Otherwise, add a new entry
                    return [...prevEntries, currentHotelData];
                  }
                });

                setSaveChanges(true);
                setIsReadyToAddAnother(true);
                setEditingIndex(null); // Reset editing index after saving
              }}
            >
              {editingIndex !== null ? "Update Hotel" : "Save Hotel"}
            </button>

            {/* Add Another Hotel Button */}
            {isReadyToAddAnother && (
              <button
                className="add-hotel-button"
                onClick={() => {
                  setCheckInDate(checkOutDate); // Auto-set next check-in to current check-out
                  setSelectedState("");
                  setSelectedHotel(null);
                  setNights(1);
                  setSelectedRoomCategory(null);
                  setSelectedMealPlan("");
                  setApplicableSeason(null); // Assuming this is no longer applicable or should be reset
                  setNumDouble([0]);
                  setNumExtraAdult([0]);
                  setNumExtraChild([0]);
                  setHotelTotal([0]);
                  setSaveChanges(false);
                  setIsReadyToAddAnother(false);
                  setEditingIndex(null); // Ensure editing state is cleared
                  //setShowTransportSection(false); // Optionally reset transport/activities when adding new hotel
                  //setShowActivitiesSection(false);
                }}
              >
                ➕ Add Another Hotel
              </button>
            )}
          </div>

          {/* Current Hotel Selection Summary (shown after saving/updating) */}
          {saveChanges && (
            <div className="summary-section">
              <h3>Current Hotel Selection Summary</h3>
              <ul>
                <li>
                  <strong>Check-in Date:</strong> {formatDate(checkInDate)}
                </li>
                <li>
                  <strong>Number of Nights:</strong> {nights}
                </li>
                <li>
                  <strong>Check-out Date:</strong> {formatDate(checkOutDate)}
                </li>
                <li>
                  <strong>State:</strong> {selectedState}
                </li>
                <li>
                  <strong>Hotel:</strong>{" "}
                  {hotels.find((h) => h.id === selectedHotel)?.name || "N/A"}
                </li>
                <li>
                  <strong>City:</strong>{" "}
                  {hotels.find((h) => h.id === selectedHotel)?.city || "N/A"}
                </li>
                <li>
                  <strong>Room Category:</strong>{" "}
                  {selectedRoomCategory || "Not Selected"}{" "}
                </li>
                <li>
                  <strong>Room Selection:</strong>
                  <ul>
                    <li>Double Rooms: {numDouble[0]}</li>
                    <li>Extra Adults: {numExtraAdult[0]}</li>
                    <li>Extra Children: {numExtraChild[0]}</li>
                  </ul>
                </li>
                <li>
                  <strong>Meal Plan:</strong> {selectedMealPlan || "Not Selected"}{" "}
                </li>
                <li>
                  <strong>Total Hotel Cost (per night):</strong> ₹{hotelTotal[0]}
                </li>
                <li>
                  <strong>Total Cost (Nights × Hotel Cost):</strong> ₹
                  {nights && hotelTotal[0] ? (nights * hotelTotal[0]).toFixed(2) : 0}
                </li>
              </ul>
            </div>
          )}
        </>
      ) : (
        <div className="no-hotel-selected">
          <p>Please select a hotel to proceed with room selection.</p>
        </div>
      )}

      {/* Saved Hotel Itinerary Section */}
      {hotelEntries.length > 0 && (
        <div className="saved-hotels-summary">
          <h3>Saved Hotel Itinerary:</h3>
          <ol>
            {hotelEntries.map((entry, index) => (
              <li key={index}>
                <strong>{entry.hotel}</strong> in {entry.city},{" "}
                {entry.state} <br /> {formatDate(entry.checkInDate)} to{" "}
                {formatDate(entry.checkOutDate)} <br />
                Nights: {entry.nights} <br />
                <strong>Room Category:</strong>{" "}
                {entry.selectedRoomCategory || "Not Selected"} <br />{" "}
                Rooms: Double {entry.numDouble}, Extra Adults{" "}
                {entry.numExtraAdult}, Extra Children {entry.numExtraChild}{" "}
                <br />
                <strong>Meal Plan:</strong> {entry.selectedMealPlan || "Not Selected"}{" "}
                <br />
                <strong>Total Cost (Nights × Hotel Cost):</strong> ₹
                {(entry.nights * entry.hotelTotal).toFixed(2)}
                <br />
                {/* Edit Button */}
                <button
                  className="edit-hotel-button"
                  onClick={() => handleEditHotel(index)}
                >
                  Edit
                </button>
                {/* Delete Button */}
                <button
                  className="delete-hotel-button"
                  onClick={() => handleDeleteHotel(index)}
                >
                  Delete
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Transport Section */}
      <div className="transport-section-wrapper">
        {!showTransportSection && (
          <button
            className="add-transport-button"
            onClick={() => setShowTransportSection(true)}
          >
            Add Transport
          </button>
        )}

        {showTransportSection && (
          <div className="transport-section">
            <h3>Select Transport</h3>
            <SelectTransport onTransportSelect={setSelectedTransport} />
          </div>
        )}
      </div>

      {/* Activities Section */}
      <button
        className="add-activities-button"
        onClick={() => setShowActivitiesSection(true)}
      >
        Add Activities
      </button>

      {showActivitiesSection && (
        <div className="activities-section">
          <h3>Select Activities</h3>
          <SelectActivities
            selectedState={selectedState}
            onDone={handleActivitiesDone}
          />
        </div>
      )}

      {/* Selected Activities Summary */}
      {selectedActivities.length > 0 && (
        <div className="activities-summary">
          <h4>Selected Activities:</h4>
          <ul>
            {selectedActivities.map((act, idx) => (
              <li key={idx}>
                <strong>Activity Name:</strong> {act.name} <br />
                <strong>City:</strong> {act.city} <br />
                <strong>No. of People:</strong> {act.participants} <br />
                <strong>Total:</strong> ₹{act.totalPrice.toFixed(2)}
                <hr />
              </li>
            ))}
          </ul>
          <p style={{ fontWeight: "bold", marginTop: "8px" }}>
            Total Activity Price: ₹{activityTotalPrice.toFixed(2)}
          </p>
        </div>
      )}

      {/* Markup Section */}
      {(selectedActivities.length > 0 ||
        hotelEntries.length > 0 ||
        selectedTransport) && (
          <div className="markup-section">
            <h3> Add Markup</h3>

            <div className="flex-container">
              <label htmlFor="markupInput">Markup (₹ or %):</label>
              <input
                id="markupInput"
                type="number"
                min="0"
                placeholder="Enter amount or %"
                value={markupAmount}
                onChange={(e) => setMarkupAmount(Number(e.target.value))}
              />
              <select
                value={markupType}
                onChange={(e) => setMarkupType(e.target.value)}
              >
                <option value="lumpsum">Lumpsum (₹)</option>
                <option value="percentage">Percentage (%)</option>
              </select>

              <button
                onClick={() => {
                  const baseTotal =
                    hotelEntries.reduce(
                      (acc, entry) => acc + entry.nights * entry.hotelTotal,
                      0
                    ) +
                    (selectedTransport?.selectedVehicle?.price
                      ? Number(selectedTransport.selectedVehicle.price)
                      : 0) +
                    activityTotalPrice;

                  const calculatedMarkup =
                    markupType === "percentage"
                      ? (markupAmount / 100) * baseTotal
                      : markupAmount;

                  setConfirmedMarkup(calculatedMarkup);
                }}
              >
                Apply Markup
              </button>
            </div>

            <p style={{ marginTop: "10px", fontWeight: "bold" }}>
              Confirmed Markup: ₹{confirmedMarkup.toFixed(2)}
            </p>
          </div>
        )}
      <button
        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        onClick={() => setShowSaveModal(true)}
      >
        Save Package
      </button>



      {/* Grand Total Section */}
      {showSaveModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg w-[90%] max-w-md shadow-lg">
            <h2 className="text-lg font-semibold mb-4">Enter Package Name</h2>
            <input
              type="text"
              value={packageName}
              onChange={(e) => setPackageName(e.target.value)}
              placeholder="e.g., Goa Delight"
              className="w-full px-4 py-2 border border-gray-300 rounded-md mb-4"
            />
            <h2 className="text-lg font-semibold mb-4">Enter Customer Name</h2>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g., John Doe"
              className="w-full px-4 py-2 border border-gray-300 rounded-md mb-4"
            />
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowSaveModal(false)}
                className="bg-gray-300 px-4 py-2 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePackage}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grand-total-section">
        <h3> Grand Total</h3>

        <p>
          <strong>Total Hotel Price:</strong> ₹
          {hotelTotalPrice.toFixed(2)}
        </p>

        <p>
          <strong>Total Transport Price:</strong> ₹
          {transportTotalPrice.toFixed(2)}
        </p>

        <p>
          <strong>Total Activity Price:</strong> ₹
          {activityTotalPrice.toFixed(2)}
        </p>

        <p>
          <strong>Markup:</strong> ₹{confirmedMarkup.toFixed(2)}
        </p>

        <hr />

        <h4>
          <strong>Grand Total:</strong> ₹{grandTotal.toFixed(2)}
        </h4>
      </div>

      {/* New Buttons for Copy and PDF */}
      <div className="flex-container">
        <button
          onClick={handleCopyToClipboard}
          className="copy-button"
        >
          Copy Summary to Clipboard
        </button>

        <button
          onClick={handleExportToPDF}
          className="pdf-button"
        >
          Export Summary as PDF
        </button>
      </div>
    </div>
  );
};

export default Create_new_package;