// src/components/Create_new_package.jsx
import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
  doc,
} from "firebase/firestore";
import "@/components/css/create_new_package.css";
import HotelRoomSelector from "./HotelRoomSelector";
import SelectTransport from "./TransportSelector";
import SelectActivities from "./SelectActivities";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "jspdf-autotable";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  MapPin,
  Hotel,
  Car,
  Palmtree,
  Plus,
  Trash2,
  Edit3,
  Wallet,
  FileText,
  Copy,
  CheckCircle,
  IndianRupee,
  Save,
} from "lucide-react";

import { db } from "@/firebase/config";
import { useSelector, useDispatch } from "react-redux";
import {
  addHotelEntry,
  updateHotelEntry,
  deleteHotelEntry,
  setSelectedTransport,
  setSelectedActivities,
  setConfirmedMarkup,
  setPackageName,
  setCustomerName,
} from "@/store/packageSlice";

function CreateNewPackage({
  checkInDate: propCheckInDate,
  setCheckInDate: propSetCheckInDate,
  checkOutDate: propCheckOutDate,
  setCheckOutDate: propSetCheckOutDate,
  saveChanges: propSaveChanges,
  setSaveChanges: propSetSaveChanges,
}) {
  // ── Local component state ────────────────────────────────────────
  const [hotels, setHotels] = useState([]);
  const [states, setStates] = useState([]);
  const [selectedState, setSelectedState] = useState("");
  const [selectedHotelId, setSelectedHotelId] = useState(null);
  const [nights, setNights] = useState(1);
  const [selectedRoomCategory, setSelectedRoomCategory] = useState(null);
  const [selectedMealPlan, setSelectedMealPlan] = useState("");
  const [numDouble, setNumDouble] = useState([0]);
  const [numExtraAdult, setNumExtraAdult] = useState([0]);
  const [numExtraChild, setNumExtraChild] = useState([0]);
  const [hotelTotal, setHotelTotal] = useState([0]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [isReadyToAddAnother, setIsReadyToAddAnother] = useState(false);
  const [showTransportSection, setShowTransportSection] = useState(false);
  const [showActivitiesSection, setShowActivitiesSection] = useState(false);
  const [markupAmount, setMarkupAmount] = useState(0);
  const [markupType, setMarkupType] = useState("lumpsum");
  const [showSaveModal, setShowSaveModal] = useState(false);

  // ── Redux ────────────────────────────────────────────────────────
  const dispatch = useDispatch();
  const {
    hotelEntries,
    selectedTransport,
    selectedActivities,
    activityTotalPrice,
    confirmedMarkup,
    packageName,
    customerName,
  } = useSelector((state) => state.package);
  const { user } = useSelector((state) => state.auth);

  const checkInDate = propCheckInDate;
  const setCheckInDate = propSetCheckInDate;
  const checkOutDate = propCheckOutDate;
  const setCheckOutDate = propSetCheckOutDate;
  const saveChanges = propSaveChanges;
  const setSaveChanges = propSetSaveChanges;

  // ── Data fetching ────────────────────────────────────────────────
  useEffect(() => {
    async function fetchData() {
      try {
        // Hotels
        const hotelsSnap = await getDocs(collection(db, "hotels"));
        const hotelList = hotelsSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          rooms: d.data().rooms || [],
        }));
        // Remove exact duplicates
        const unique = [
          ...new Map(
            hotelList.map((h) => [
              `${h.name?.toLowerCase()}-${h.state?.toLowerCase()}-${h.city?.toLowerCase()}`,
              h,
            ]),
          ).values(),
        ];
        setHotels(unique);

        // States / Locations
        const statesSnap = await getDocs(collection(db, "locations"));
        setStates(statesSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Error loading initial data:", err);
      }
    }
    fetchData();
  }, []);

  // Auto-update checkout date
  useEffect(() => {
    if (!checkInDate || !nights) return;
    const inDate = new Date(checkInDate);
    if (isNaN(inDate.getTime())) return;
    const outDate = new Date(inDate);
    outDate.setDate(inDate.getDate() + Number(nights));
    setCheckOutDate(outDate.toISOString().split("T")[0]);
  }, [checkInDate, nights, setCheckOutDate]);

  // ── Derived values (FIXED!) ──────────────────────────────────────
  const hotelTotalPrice = hotelEntries.reduce(
    (sum, entry) => sum + Number(entry.hotelTotal || 0), // ← Correct: hotelTotal is already full total
    0,
  );

  const transportTotalPrice = Number(
    selectedTransport?.selectedVehicle?.price || 0,
  );

  const grandTotal =
    hotelTotalPrice +
    transportTotalPrice +
    (activityTotalPrice || 0) +
    (confirmedMarkup || 0);

  // ── Format helpers ───────────────────────────────────────────────
  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return isNaN(d)
      ? "—"
      : d
          .toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
          .replace(/ /g, "-");
  };

  // ── Handlers ─────────────────────────────────────────────────────
  const handleAddOrUpdateHotel = () => {
    const hotelData = hotels.find((h) => h.id === selectedHotelId);
    if (!hotelData) return;

    const entry = {
      checkInDate,
      nights: Number(nights),
      checkOutDate,
      state: selectedState,
      hotel: hotelData.name || "N/A",
      city: hotelData.city || "N/A",
      GoogleListingURL: hotelData.GoogleListingURL || null,
      numDouble: Number(numDouble[0] || 0),
      numExtraAdult: Number(numExtraAdult[0] || 0),
      numExtraChild: Number(numExtraChild[0] || 0),
      hotelTotal: Number(hotelTotal[0] || 0),
      selectedMealPlan,
      selectedRoomCategory,
    };

    if (editingIndex !== null) {
      dispatch(updateHotelEntry({ index: editingIndex, data: entry }));
    } else {
      dispatch(addHotelEntry(entry));
    }

    setSaveChanges(true);
    setIsReadyToAddAnother(true);
    setEditingIndex(null);
  };

  const handleEditHotel = (index) => {
    const entry = hotelEntries[index];
    setSelectedState(entry.state || "");
    setSelectedHotelId(
      hotels.find(
        (h) =>
          h.name === entry.hotel &&
          h.city === entry.city &&
          h.state === entry.state,
      )?.id || null,
    );
    setNights(entry.nights || 1);
    setCheckInDate(entry.checkInDate || "");
    setSelectedRoomCategory(entry.selectedRoomCategory || null);
    setSelectedMealPlan(entry.selectedMealPlan || "");
    setNumDouble([entry.numDouble || 0]);
    setNumExtraAdult([entry.numExtraAdult || 0]);
    setNumExtraChild([entry.numExtraChild || 0]);
    setHotelTotal([entry.hotelTotal || 0]);
    setEditingIndex(index);
  };

  const handleDeleteHotel = (index) => {
    dispatch(deleteHotelEntry(index));
  };

  const resetHotelForm = () => {
    setSelectedState("");
    setSelectedHotelId(null);
    setNights(1);
    setCheckInDate(checkOutDate);
    setSelectedRoomCategory(null);
    setSelectedMealPlan("");
    setNumDouble([0]);
    setNumExtraAdult([0]);
    setNumExtraChild([0]);
    setHotelTotal([0]);
    setEditingIndex(null);
    setSaveChanges(false);
    setIsReadyToAddAnother(false);
  };

  // ── generatePackageSummary ───────────────────────────────────────
  const generatePackageSummary = (quotationData, allHotelsData) => {
    if (
      !quotationData ||
      !quotationData.hotelEntries ||
      quotationData.hotelEntries.length === 0
    ) {
      return "Hotel details not available.";
    }

    const firstEntry = quotationData.hotelEntries[0];
    const formatDateForSummary = (dateStr) => {
      const date = new Date(dateStr);
      if (isNaN(date)) return "Invalid Date";
      const options = { day: "2-digit", month: "short", year: "numeric" };
      return date.toLocaleDateString("en-GB", options).replace(/ /g, "-");
    };

    let summary = "";

    summary += `Dear Guests,\n\n`;
    summary += `Greetings from Adwait Tours!!\n`;
    summary += `Kindly find the best possible rates for your requirement starting ${formatDateForSummary(firstEntry.checkInDate)}\n\n`;

    summary += `${firstEntry.numDouble || 0} Couple\n`;
    summary += `${firstEntry.numExtraChild || 0} Extra Child\n`;
    summary += `${firstEntry.numExtraAdult || 0} Extra Adult\n\n`;

    summary += `*HOTELS*\n`;
    quotationData.hotelEntries.forEach((entry, index) => {
      const hotelFullDetails = allHotelsData.find(
        (h) =>
          h.name === entry.hotel &&
          h.city === entry.city &&
          h.state === entry.state,
      );

      const hotelCheckIn = formatDateForSummary(entry.checkInDate);
      const hotelCheckOut = formatDateForSummary(entry.checkOutDate);

      const hotelNights = entry.nights;
      const mealPlan = entry.selectedMealPlan?.toUpperCase() || "MEAL PLAN";
      const mealPlanDescriptions = {
        EP: "Accommodation only",
        CP: "Breakfast Only",
        MAP: "Breakfast and Dinner",
        AP: "Breakfast, Lunch and Dinner",
      };
      const roomCategory =
        entry.selectedRoomCategory?.toUpperCase() ||
        "ROOM CATEGORY NOT SELECTED";
      const roomCount = entry.numDouble || 0;

      summary += `${index + 1}. ${entry.hotel.toUpperCase()} ${hotelFullDetails?.GoogleListingURL || ""}\n`;
      summary += ` ⇒ ${entry.city}, ${entry.state}\n`;
      summary += ` ⇒ Hotel Room Count: ${roomCount} Hotel Room Category: ${roomCategory}\n`;
      summary += ` ⇒ ${hotelCheckIn} to ${hotelCheckOut} (${hotelNights} Nights, ${mealPlanDescriptions[mealPlan] || mealPlan})\n\n`;
    });

    const { totalBreakfasts, totalLunches, totalDinners } = calculateTotalMeals(
      quotationData.hotelEntries,
    );

    summary += `*TOTAL TOUR COST = ₹${quotationData.grandTotal.toLocaleString("en-IN")}/-*\n\n`;

    summary += `*INCLUDED*\n`;

    if (totalBreakfasts > 0) summary += `✅ ${totalBreakfasts} Breakfast(s)\n`;
    if (totalLunches > 0) summary += `✅ ${totalLunches} Lunch(es)\n`;
    if (totalDinners > 0) summary += `✅ ${totalDinners} Dinner(s)\n`;
    if (totalBreakfasts === 0 && totalLunches === 0 && totalDinners === 0) {
      summary += `✅ No meals included (EP Plan for all hotels or unspecified)\n`;
    }

    if (quotationData.selectedTransport?.selectedVehicle) {
      const vehicle = quotationData.selectedTransport.selectedVehicle;
      const acStatus = vehicle.ac ? "AC" : "Non AC";
      summary += `✅ ${vehicle.name || vehicle.type} ${acStatus} for all sightseeing and transfer as per itinerary\n`;
      summary += `✅ Toll, Parking, Driver Allowance, Permits\n`;
    }

    quotationData.selectedActivities?.forEach((activity) => {
      summary += `✅ ${activity.name.toUpperCase()} (${activity.city || "—"}) - ${activity.participants} Person\n`;
    });

    summary += `\n*EXCLUDED*\n`;
    summary += `❌ Train / Flight Fare\n`;
    summary += `❌ Early check in and late check out as per hotel policy\n`;
    summary += `❌ Medical, Emergency, Entry Tickets, activities, expenses\n`;
    summary += `❌ Anything not mentioned in included\n`;

    return summary;
  };

  // ── handleCopyToClipboard ────────────────────────────────────────
  const handleCopyToClipboard = () => {
    const currentPackageData = {
      hotelEntries,
      selectedTransport,
      selectedActivities,
      grandTotal,
      markup: confirmedMarkup,
      customerName,
      packageName,
    };

    const summary = generatePackageSummary(currentPackageData, hotels);
    let isCopySuccessful = false;

    const textarea = document.createElement("textarea");
    textarea.value = summary;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "-9999px";
    document.body.appendChild(textarea);

    try {
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);
      isCopySuccessful = document.execCommand("copy");

      if (!isCopySuccessful && navigator.clipboard?.writeText) {
        navigator.clipboard
          .writeText(summary)
          .then(() => alert("Package summary copied to clipboard!"))
          .catch((err) => alert("Failed to copy: " + err));
        return;
      }
    } catch (err) {
      console.error("Clipboard copy error:", err);
    } finally {
      document.body.removeChild(textarea);
    }

    if (isCopySuccessful) {
      alert("Package summary copied to clipboard!");
    } else {
      alert("Failed to copy to clipboard.");
    }
  };

  // ── handleExportToPDF ─────────────────────────────────────────────
  const handleExportToPDF = () => {
    if (!hotelEntries || hotelEntries.length === 0) {
      alert(
        "Cannot generate PDF: Please add at least one hotel to the package.",
      );
      return;
    }

    const doc = new jsPDF();
    const BRAND_COLOR_BLUE = "#0D47A1";
    const HEADER_TEXT_COLOR = "#444444";
    const FONT_SIZE_NORMAL = 9;
    const FONT_SIZE_SMALL = 8;
    const pageContentWidth = 180;

    const img = new Image();
    img.src = "./await-logo.jpg"; // ← make sure this path is correct in your project

    img.onload = () => {
      const addHeader = () => {
        const logoY = 10;
        const companyNameY = logoY + 8;
        const sloganY = companyNameY + 7;

        const logoWidth = 40;
        const logoHeight = (img.height * logoWidth) / img.width;
        doc.addImage(img, "PNG", 15, logoY, logoWidth, logoHeight);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(BRAND_COLOR_BLUE);
        doc.text("Adwait Tours", 60, companyNameY);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(HEADER_TEXT_COLOR);
        doc.text("Travel Package Quotation", 60, sloganY);

        doc.setFontSize(FONT_SIZE_SMALL);
        doc.setTextColor(HEADER_TEXT_COLOR);

        const contactBlockX = 160;
        let contactLineY = logoY + 4;

        const phoneNumber = "+91 9884798483";
        const phoneLink = `tel:${phoneNumber.replace(/ /g, "")}`;
        const phoneText = `Phone: ${phoneNumber}`;
        doc.text(phoneText, contactBlockX, contactLineY, { align: "left" });
        // Note: jsPDF link is limited – you may need jspdf-link plugin or skip links

        contactLineY += 5;
        const emailAddress = "sales@adwaittours.com";
        const emailText = `Email: ${emailAddress}`;
        doc.text(emailText, contactBlockX, contactLineY);

        contactLineY += 5;
        const webAddress = "www.adwaittours.com";
        const webText = `Web: ${webAddress}`;
        doc.text(webText, contactBlockX, contactLineY);

        const finalHeaderBottomY =
          Math.max(logoY + logoHeight, sloganY, contactLineY) + 5;
        doc.setDrawColor("#CCCCCC");
        doc.setLineWidth(0.2);
        doc.line(15, finalHeaderBottomY, 200, finalHeaderBottomY);
      };

      const addFooter = () => {
        doc.setDrawColor("#CCCCCC");
        doc.setLineWidth(0.2);
        doc.line(15, 282, 200, 282);
        doc.setFontSize(FONT_SIZE_SMALL);
        doc.setTextColor(HEADER_TEXT_COLOR);
        doc.text("Thank you for choosing Adwait Tours!", 107, 287, {
          align: "center",
        });
        doc.text("For Reviews: Google Page | Follow Us: Instagram", 107, 291, {
          align: "center",
        });
      };

      addHeader();
      let currentY = 32;
      currentY += 10;

      const currentQuotationDataForPdf = {
        hotelSummary: hotelEntries,
        transportSummary: selectedTransport,
        activitySummary: selectedActivities,
        grandTotal,
        markup: confirmedMarkup,
        customerName,
        packageName,
      };

      const formatPdfDateInternal = (dateStr) => {
        const date = new Date(dateStr);
        if (isNaN(date)) return "Invalid Date";
        const options = { day: "2-digit", month: "short", year: "numeric" };
        return date.toLocaleDateString("en-GB", options);
      };

      const MealPlans = {
        EP: "Accommodation only",
        CP: "Breakfast only",
        MAP: "Breakfast and Dinner",
        AP: "Breakfast, lunch, and dinner",
      };

      // Guest & Package Info
      const firstHotelPdf = currentQuotationDataForPdf.hotelSummary[0];
      autoTable(doc, {
        startY: currentY,
        body: [
          [
            "Customer Name:",
            currentQuotationDataForPdf.customerName || "N/A",
            "Date:",
            formatPdfDateInternal(new Date().toISOString()),
          ],
          [
            "Package Name:",
            currentQuotationDataForPdf.packageName || "N/A",
            "Guests:",
            `${firstHotelPdf?.numDouble || 0} Couple(s), ${firstHotelPdf?.numExtraAdult || 0} Adult(s), ${firstHotelPdf?.numExtraChild || 0} Child(ren)`,
          ],
        ],
        theme: "plain",
        styles: { fontSize: FONT_SIZE_NORMAL },
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: 35 },
          1: { cellWidth: "auto" },
          2: { fontStyle: "bold", cellWidth: 35 },
          3: { cellWidth: "auto" },
        },
        margin: { left: 15, right: 15 },
      });
      currentY = doc.lastAutoTable.finalY + 10;

      // Hotel Details Table
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Hotel Details", 15, currentY);
      currentY += 8;

      autoTable(doc, {
        startY: currentY,
        head: [
          ["Hotel Name", "City", "Room Type", "Dates", "Nights", "Meal Plan"],
        ],
        body: currentQuotationDataForPdf.hotelSummary.map((h) => {
          const fullHotelData = hotels.find(
            (hotel) =>
              hotel.name === h.hotel &&
              hotel.city === h.city &&
              hotel.state === h.state,
          );
          return [
            { content: h.hotel, _fullData: fullHotelData },
            h.city,
            h.selectedRoomCategory || "—",
            `${formatPdfDateInternal(h.checkInDate)} - ${formatPdfDateInternal(h.checkOutDate)}`,
            h.nights,
            MealPlans[h.selectedMealPlan?.toUpperCase()] ||
              h.selectedMealPlan ||
              "—",
          ];
        }),
        theme: "grid",
        headStyles: { fillColor: BRAND_COLOR_BLUE },
        styles: { fontSize: FONT_SIZE_NORMAL, cellPadding: 2 },
        margin: { left: 15, right: 15 },
        didDrawPage: () => addHeader(),
        didParseCell: (data) => {
          if (data.section === "body" && data.column.index === 0) {
            if (data.cell.raw?._fullData?.GoogleListingURL) {
              data.cell.styles.textColor = [0, 0, 255];
            }
          }
        },
        didDrawCell: (data) => {
          if (data.section === "body" && data.column.index === 0) {
            const url = data.cell.raw?._fullData?.GoogleListingURL;
            if (url) {
              doc.link(
                data.cell.x,
                data.cell.y,
                data.cell.width,
                data.cell.height,
                { url },
              );
            }
          }
        },
      });
      currentY = doc.lastAutoTable.finalY + 10;

      // Grand Total
      autoTable(doc, {
        startY: currentY,
        body: [
          [
            {
              content: "Grand Total Tour Cost:",
              styles: {
                halign: "left",
                fontStyle: "bold",
                textColor: BRAND_COLOR_BLUE,
              },
            },
            {
              content: `Rs. ${currentQuotationDataForPdf.grandTotal.toLocaleString("en-IN", { maximumFractionDigits: 0 })}/-`,
              styles: {
                halign: "right",
                fontStyle: "bold",
                textColor: BRAND_COLOR_BLUE,
              },
            },
          ],
        ],
        theme: "grid",
        styles: { fontSize: FONT_SIZE_NORMAL + 2, cellPadding: 3 },
        columnStyles: { 0: { cellWidth: 120 }, 1: { cellWidth: "auto" } },
        margin: { left: 15, right: 15 },
        didDrawPage: () => addHeader(),
      });
      currentY = doc.lastAutoTable.finalY + 10;

      // Inclusions & Exclusions
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Inclusions & Exclusions", 15, currentY);
      currentY += 8;

      const columnWidth = pageContentWidth / 2 - 5;
      const includedItems = ["• Hotel accommodation as specified."];
      const { totalBreakfasts, totalLunches, totalDinners } =
        calculateTotalMeals(currentQuotationDataForPdf.hotelSummary);

      if (totalBreakfasts > 0)
        includedItems.push(`• ${totalBreakfasts} Breakfast(s)`);
      if (totalLunches > 0) includedItems.push(`• ${totalLunches} Lunch(es)`);
      if (totalDinners > 0) includedItems.push(`• ${totalDinners} Dinner(s)`);
      if (
        totalBreakfasts === 0 &&
        totalLunches === 0 &&
        totalDinners === 0 &&
        currentQuotationDataForPdf.hotelSummary.length > 0
      ) {
        includedItems.push(
          "• No meals included (EP Plan for all hotels or unspecified)",
        );
      }

      if (currentQuotationDataForPdf.transportSummary?.selectedVehicle) {
        const vehicle =
          currentQuotationDataForPdf.transportSummary.selectedVehicle;
        includedItems.push(
          `• All transfers and sightseeing by private ${vehicle.name || vehicle.type}${vehicle.ac ? " (AC)" : ""} vehicle.`,
        );
        includedItems.push(
          "• Toll, parking fees, driver allowance, and permits.",
        );
      }

      if (currentQuotationDataForPdf.activitySummary?.length > 0) {
        currentQuotationDataForPdf.activitySummary.forEach((activity) => {
          includedItems.push(
            `• ${activity.name} for ${activity.participants} participants.`,
          );
        });
      }

      const excludedItems = [
        "• Train / Flight Fare.",
        "• Early check-in & late check-out as per hotel policy.",
        '• Any items not mentioned in the "Included" section.',
      ];

      const wrappedIncluded = includedItems.map((item) =>
        doc.splitTextToSize(item, columnWidth),
      );
      const wrappedExcluded = excludedItems.map((item) =>
        doc.splitTextToSize(item, columnWidth),
      );

      const body = [];
      const maxLength = Math.max(
        wrappedIncluded.length,
        wrappedExcluded.length,
      );
      for (let i = 0; i < maxLength; i++) {
        body.push([wrappedIncluded[i] || "", wrappedExcluded[i] || ""]);
      }

      autoTable(doc, {
        startY: currentY,
        head: [["INCLUDED", "EXCLUDED"]],
        body,
        headStyles: { fillColor: BRAND_COLOR_BLUE, halign: "center" },
        theme: "grid",
        styles: { fontSize: FONT_SIZE_NORMAL, cellPadding: 2 },
        margin: { left: 15, right: 15 },
        didDrawPage: () => addHeader(),
      });

      addFooter();
      doc.save(
        `Travel_Package_Quotation_${new Date().toISOString().split("T")[0]}.pdf`,
      );
    };

    img.onerror = () => {
      alert("Failed to load logo for PDF. Generating without logo...");
      // You can continue generating PDF without logo if needed
    };
  };

  // ── handleSavePackage ─────────────────────────────────────────────
  const handleSavePackage = async () => {
    if (!packageName.trim()) return alert("Please enter a package name.");
    if (!customerName.trim()) return alert("Please enter a customer name.");

    try {
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
        hotelSummary: hotelEntries,
        activitySummary: selectedActivities,
        transportSummary: selectedTransport
          ? {
              vehicles: selectedTransport.vehicles || [],
              allPkgs: selectedTransport.allPkgs || [],
              packageName: selectedTransport.name || "Custom",
              vehicleName: selectedTransport.selectedVehicle?.type || "",
              seats: selectedTransport.selectedVehicle?.seating || "",
              price: selectedTransport.selectedVehicle?.price || 0,
              ac: selectedTransport.selectedVehicle?.ac || false,
              isCustom: selectedTransport.selectedVehicle?.isCustom || false,
              perKmprice: selectedTransport.selectedVehicle?.perKmprice || 0,
            }
          : null,
      };

      await addDoc(packagesCollectionRef, packageData);

      alert("Package saved successfully!");
      setShowSaveModal(false);
      dispatch(setPackageName(""));
      dispatch(setCustomerName(""));
    } catch (err) {
      console.error("Error saving package:", err);
      alert("Failed to save package: " + err.message);
    }
  };

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pb-16">
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:gap-10 xl:gap-12">
          {/* ── LEFT ── Main form content ──────────────────────────────── */}
          <div className="flex-1 space-y-10 lg:pr-6 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto pb-10 lg:pb-0">
            {/* Dates */}
            <section className="grid md:grid-cols-3 gap-6 p-6 bg-white rounded-xl border shadow-sm">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> Check-in
                </Label>
                <Input
                  type="date"
                  min={new Date().toISOString().split("T")[0]}
                  value={checkInDate}
                  onChange={(e) => setCheckInDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Nights</Label>
                <Input
                  type="number"
                  min={1}
                  value={nights}
                  onChange={(e) => setNights(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Check-out</Label>
                <Input
                  type="date"
                  value={checkOutDate}
                  readOnly
                  className="bg-slate-50 cursor-not-allowed"
                />
              </div>
            </section>

            {/* State */}
            <section className="p-6 bg-white rounded-xl border shadow-sm space-y-4">
              <Label className="flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Destination State
              </Label>
              <select
                className="w-full border rounded-md p-2.5 focus:ring-2 focus:ring-blue-500"
                value={selectedState}
                onChange={(e) => {
                  setSelectedState(e.target.value);
                  setSelectedHotelId(null);
                  setEditingIndex(null);
                }}
              >
                <option value="">— Select state —</option>
                {states.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </section>

            {/* Hotel list – only shown when state selected */}
            {/* 3. Hotel Selection */}
            {selectedState && (
              <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-semibold text-theme-dark mb-4 flex items-center gap-2">
                  <Hotel className="w-5 h-5" /> Hotels in {selectedState}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-64 overflow-y-auto p-1">
                  {Object.keys(groupedHotels).map((city) => (
                    <div key={city} className="space-y-2">
                      <h4 className="text-xs font-bold uppercase text-theme-secondary tracking-wider">
                        {city}
                      </h4>
                      {groupedHotels[city].map((hotel) => (
                        <div
                          key={hotel.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                            selectedHotel === hotel.id
                              ? "bg-theme-muted border-theme-primary"
                              : "hover:bg-slate-50 border-slate-100"
                          }`}
                        >
                          <input
                            type="radio"
                            name="hotel"
                            className="accent-theme-primary"
                            id={`hotel-${hotel.id}`}
                            value={hotel.id}
                            checked={selectedHotel === hotel.id}
                            onChange={() => setSelectedHotel(hotel.id)}
                          />
                          <label
                            htmlFor={`hotel-${hotel.id}`}
                            className="text-sm cursor-pointer flex-1"
                          >
                            <span className="font-medium block">
                              {hotel.name}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {hotel.city} • Rating:{" "}
                              {hotel.GoogleReviewRating || "N/A"}
                            </span>
                          </label>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Room selector + actions */}
            {selectedHotelId && (
              <section className="p-6 bg-white rounded-xl border shadow-sm space-y-8">
                <HotelRoomSelector
                  hotel={hotels.find((h) => h.id === selectedHotelId)}
                  checkInDate={checkInDate}
                  noOfNights={nights}
                  numDouble={numDouble}
                  setNumDouble={setNumDouble}
                  numExtraAdult={numExtraAdult}
                  setNumExtraAdult={setNumExtraAdult}
                  numExtraChild={numExtraChild}
                  setNumExtraChild={setNumExtraChild}
                  hotelTotal={hotelTotal}
                  setHotelTotal={setHotelTotal}
                  selectedMealPlan={selectedMealPlan}
                  setSelectedMealPlan={setSelectedMealPlan}
                  selectedRoomCategory={selectedRoomCategory}
                  setSelectedRoomCategory={setSelectedRoomCategory}
                />
                <div className="flex flex-wrap gap-4 pt-6 border-t">
                  <Button
                    onClick={handleAddOrUpdateHotel}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {editingIndex !== null ? "Update Hotel" : "Save Hotel"}
                  </Button>
                  {isReadyToAddAnother && (
                    <Button variant="outline" onClick={resetHotelForm}>
                      + Add Another Hotel
                    </Button>
                  )}
                </div>
              </section>
            )}

            {/* Saved hotels */}
            {hotelEntries.length > 0 && (
              <section className="space-y-6">
                <h3 className="text-xl font-semibold flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  Saved Hotels
                </h3>
                <div className="space-y-4">
                  {hotelEntries.map((entry, idx) => (
                    <div
                      key={idx}
                      className="p-5 bg-white border rounded-xl shadow-sm hover:shadow transition-shadow"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-2 flex-1">
                          <p className="font-bold text-lg">{entry.hotel}</p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="h-4 w-4" />
                              {formatDate(entry.checkInDate)} –{" "}
                              {formatDate(entry.checkOutDate)}
                            </span>
                            <span className="font-medium text-blue-600">
                              {entry.nights} Night
                              {entry.nights !== 1 ? "s" : ""}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <div>
                              Room:{" "}
                              <strong>
                                {entry.selectedRoomCategory || "—"}
                              </strong>
                            </div>
                            <div>
                              Meal:{" "}
                              <strong>{entry.selectedMealPlan || "EP"}</strong>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-8">
                          <div className="text-right min-w-[140px]">
                            <p className="text-xs text-slate-500">Total</p>
                            <p className="text-2xl font-bold text-blue-600">
                              ₹
                              {Number(entry.hotelTotal || 0).toLocaleString(
                                "en-IN",
                              )}
                            </p>
                            <p className="text-xs text-slate-500">
                              for {entry.nights} night
                              {entry.nights !== 1 ? "s" : ""}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditHotel(idx)}
                              className="p-2 hover:text-blue-600 rounded hover:bg-blue-50"
                              title="Edit"
                            >
                              <Edit3 className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteHotel(idx)}
                              className="p-2 hover:text-red-600 rounded hover:bg-red-50"
                              title="Delete"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Transport */}
            <section className="p-6 bg-white rounded-xl border shadow-sm space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Car className="h-5 w-5" /> Transport
              </h3>
              {!showTransportSection ? (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowTransportSection(true)}
                >
                  Add Transport
                </Button>
              ) : (
                <SelectTransport
                  onTransportSelect={(t) => dispatch(setSelectedTransport(t))}
                />
              )}
            </section>

            {/* Activities */}
            <section className="p-6 bg-white rounded-xl border shadow-sm space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Palmtree className="h-5 w-5" /> Activities
              </h3>
              <Button
                className="w-full bg-gray-800 hover:bg-gray-900"
                onClick={() => setShowActivitiesSection(true)}
              >
                Add Activities
              </Button>
              {showActivitiesSection && (
                <div className="mt-4 p-4 bg-slate-50 border rounded-lg">
                  <SelectActivities
                    selectedState={selectedState}
                    onDone={(acts, total) =>
                      dispatch(
                        setSelectedActivities({
                          activities: acts,
                          totalPrice: total,
                        }),
                      )
                    }
                  />
                </div>
              )}
            </section>
          </div>

          {/* ── RIGHT ── Pricing summary (sticky) ──────────────────────── */}
          {(hotelEntries.length > 0 ||
            selectedTransport ||
            selectedActivities.length > 0) && (
            <aside className="lg:w-96 xl:w-[420px] lg:sticky lg:top-6 space-y-6 pt-8 lg:pt-0">
              {/* Grand Total Card */}
              <div className="p-6 bg-gray-900 text-white rounded-xl shadow-2xl space-y-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <IndianRupee className="h-5 w-5" /> Grand Total
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span>Hotels</span>
                    <span>₹{hotelTotalPrice.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Transport</span>
                    <span>₹{transportTotalPrice.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Activities</span>
                    <span>
                      ₹{(activityTotalPrice || 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between text-cyan-400 font-medium">
                    <span>Markup</span>
                    <span>
                      ₹{(confirmedMarkup || 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
                <hr className="border-white/20 my-5" />
                <div className="flex justify-between items-baseline">
                  <span className="font-bold text-lg">Final Amount</span>
                  <span className="text-3xl font-black">
                    ₹{grandTotal.toLocaleString("en-IN")}
                  </span>
                </div>
                <Button
                  className="w-full py-6 bg-blue-600 hover:bg-blue-700 text-lg font-bold shadow-md"
                  onClick={() => setShowSaveModal(true)}
                >
                  <Save className="mr-2 h-5 w-5" />
                  Save Package
                </Button>
              </div>
            </aside>
          )}
        </div>

        {/* Export buttons */}
        <div className="flex flex-wrap gap-4 mt-12 pt-10 border-t">
          <Button
            variant="secondary"
            onClick={handleCopyToClipboard}
            className="gap-2"
          >
            <Copy className="h-4 w-4" /> Copy Summary
          </Button>
          <Button
            variant="destructive"
            onClick={handleExportToPDF}
            className="gap-2"
          >
            <FileText className="h-4 w-4" /> Export PDF
          </Button>
        </div>
      </div>

      {/* Save modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-8 w-full max-w-md shadow-2xl space-y-6">
            <h2 className="text-xl font-bold border-b pb-3">Save Package</h2>
            <div className="space-y-4">
              <div>
                <Label>Package Name</Label>
                <Input
                  value={packageName}
                  onChange={(e) => dispatch(setPackageName(e.target.value))}
                  placeholder="e.g. Kerala Backwaters 4N/5D"
                />
              </div>
              <div>
                <Label>Customer Name</Label>
                <Input
                  value={customerName}
                  onChange={(e) => dispatch(setCustomerName(e.target.value))}
                  placeholder="Customer name"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowSaveModal(false)}>
                Cancel
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={handleSavePackage}
              >
                Save Itinerary
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CreateNewPackage;
