// src/components/Create_new_package.jsx
import React, { useEffect, useState, useMemo } from "react";
import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  serverTimestamp,
  doc,
} from "firebase/firestore";
import { useRouter, useSearchParams } from "next/navigation";
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
  Percent,
  XCircle,
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
import toast from "react-hot-toast";

const Create_new_package = ({
  userData,
  checkInDate: propCheckInDate,
  setCheckInDate: propSetCheckInDate,
  saveChanges: propSaveChanges,
  setSaveChanges: propSetSaveChanges,
  checkOutDate: propCheckOutDate,
  setCheckOutDate: propSetCheckOutDate,
}) => {
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
  const [isReadyToAddAnother, setIsReadyToAddAnother] = useState(false);
  const [showTransportSection, setShowTransportSection] = useState(false);
  const [showActivitiesSection, setShowActivitiesSection] = useState(false);
  const [markupAmount, setMarkupAmount] = useState(0);
  const [markupType, setMarkupType] = useState("lumpsum");
  const [editingIndex, setEditingIndex] = useState(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [packages, setPackages] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [numCNB, setNumCNB] = useState([0]);
  const router = useRouter();
  const { user } = useSelector((state) => state.auth);

  const checkInDate = propCheckInDate;
  const setCheckInDate = propSetCheckInDate;
  const checkOutDate = propCheckOutDate;
  const setCheckOutDate = propSetCheckOutDate;
  const saveChanges = propSaveChanges;
  const setSaveChanges = propSetSaveChanges;
  // let customerId = undefined;
  const dispatch = useDispatch();
  const {
    hotelEntries,
    selectedTransport,
    selectedActivities,
    activityTotalPrice,
    confirmedMarkup,
    packageName,
    customerName: reduxCustomerName,
  } = useSelector((state) => state.package);

  useEffect(() => {
    if (reduxCustomerName && !customerName) {
      setCustomerName(reduxCustomerName);
    }
  }, [reduxCustomerName]);

  const searchParams = useSearchParams();
  const customerId =
    searchParams.get("customerId") || searchParams.get("customerid");
  const leadId = searchParams.get("leadId");
  useEffect(() => {
    if (!customerId) return;

    const fetchCustomer = async () => {
      const snap = await getDoc(doc(db, "customers", customerId));
      if (snap.exists()) {
        console.log("Customer doc:", snap.data());
        setCustomerName(snap.data().name);
      }
    };
    console.log("Customer ID:", customerId);
    fetchCustomer();
  }, [customerId]);

  useEffect(() => {
    if (!leadId) return;
    const fetchLead = async () => {
      const snap = await getDoc(doc(db, "leads", leadId));
      if (snap.exists()) {
        console.log("lead doc:", snap.data());
        setCustomerName(snap.data().name);
      }
    };
    console.log("Customer ID:", customerId);
    fetchLead();
  }, [leadId]);

  useEffect(() => {
    console.log("Customer Name:", customerName);
  }, [customerName]);

  // ── Fetch Data ────────────────────────────────────────────────────
  useEffect(() => {
    const fetchHotels = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "hotels"));
        const hotelList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          rooms: doc.data().rooms || [],
        }));

        const uniqueHotels = [
          ...new Map(
            hotelList.map((h) => [
              `${h.name?.toLowerCase()}-${h.state?.toLowerCase()}-${h.city?.toLowerCase()}`,
              h,
            ]),
          ).values(),
        ];

        setHotels(uniqueHotels);
      } catch (error) {
        console.error("Error fetching hotels:", error);
      }
    };

    const fetchStates = async () => {
      const querySnapshot = await getDocs(collection(db, "locations"));
      setStates(
        querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })),
      );
    };

    fetchHotels();
    fetchStates();
  }, []);

  // Auto-calculate checkout date
  useEffect(() => {
    if (checkInDate && nights) {
      const inDate = new Date(checkInDate);
      if (!isNaN(inDate)) {
        const outDate = new Date(inDate);
        outDate.setDate(inDate.getDate() + parseInt(nights));
        setCheckOutDate(outDate.toISOString().split("T")[0]);
      }
    }
  }, [checkInDate, nights]);

  // ── FIXED Calculations ────────────────────────────────────────────
  const hotelTotalPrice = hotelEntries.reduce(
    (acc, entry) => acc + (Number(entry.hotelTotal) || 0),
    0,
  );

  const transportTotalPrice = selectedTransport?.selectedVehicle?.price
    ? Number(selectedTransport.selectedVehicle.price)
    : 0;

  const grandTotal =
    hotelTotalPrice +
    transportTotalPrice +
    activityTotalPrice +
    confirmedMarkup;

  // ── Group hotels by city (this fixes "groupedHotels is not defined") ──
  const filteredHotels = useMemo(() => {
    return hotels.filter(
      (hotel) => hotel.state?.toLowerCase() === selectedState.toLowerCase(),
    );
  }, [hotels, selectedState]);

  const groupedHotels = useMemo(() => {
    return filteredHotels.reduce((acc, hotel) => {
      const city = hotel.city || "Other";
      if (!acc[city]) acc[city] = [];
      acc[city].push(hotel);
      return acc;
    }, {});
  }, [filteredHotels]);

  // ── Handlers ──────────────────────────────────────────────────────
  const handleActivitiesDone = (activities, totalPrice) => {
    dispatch(setSelectedActivities({ activities, totalPrice }));
  };

  const handleDeleteHotel = (index) => {
    dispatch(deleteHotelEntry(index));
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return isNaN(date)
      ? "—"
      : date
          .toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
          .replace(/ /g, "-");
  };

  const calculateHotelTotalPriceForAllNights = (entries) => {
    if (!Array.isArray(entries) || entries.length === 0) return [];
    return entries.map((hotel) => {
      const perNightCost = parseFloat(hotel.hotelTotal) || 0;
      const numberOfNights = parseInt(hotel.nights) || 0;
      const totalPriceForAllNights = perNightCost * numberOfNights;
      return { ...hotel, hotelTotal: totalPriceForAllNights };
    });
  };

  const calculateTotalMeals = (hotelEntriesData) => {
    let totalBreakfasts = 0;
    let totalLunches = 0;
    let totalDinners = 0;

    hotelEntriesData.forEach((entry) => {
      const mealPlan = entry.selectedMealPlan?.toUpperCase() || "EP";
      const nightsAsNumber = parseInt(entry.nights, 10);

      if (isNaN(nightsAsNumber) || nightsAsNumber < 0) return;

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
        default:
          break;
      }
    });

    return { totalBreakfasts, totalLunches, totalDinners };
  };

  // ── PDF / Clipboard / Save logic ─────────────────────────────────
  // (your original implementations - kept as-is)
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
    summary += `Kindly find the best possible rates for your requirement starting ${formatDateForSummary(firstEntry.checkInDate)}\n`;

    summary += `${firstEntry.numDouble || 0} Couple\n`;
    summary += `${firstEntry.numExtraChild || 0} Extra Child\n`;
    summary += `${firstEntry.numExtraAdult || 0} Extra Adult\n\n`;

    summary += ` *HOTELS*\n`;
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
      summary += ` ⇒ ${hotelCheckIn} to ${hotelCheckOut} (${hotelNights} Nights, ${mealPlanDescriptions[mealPlan]})\n\n`;
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
      summary += `✅ ${activity.name.toUpperCase()} (${activity.city}) - ${activity.participants} Person\n`;
    });

    summary += `\n*EXCLUDED*\n`;
    summary += `❌ Train / Flight Fare\n`;
    summary += `❌ Early check in and late check out as per hotel policy\n`;
    summary += `❌ Medical, Emergency, Entry Tickets, activities, expenses\n`;
    summary += `❌ Anything not mentioned in included\n`;

    return summary;
  };

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
      if (
        !isCopySuccessful &&
        navigator.clipboard &&
        navigator.clipboard.writeText
      ) {
        navigator.clipboard
          .writeText(summary)
          .then(() => toast("Package summary copied to clipboard!"))
          .catch((err) => toast("Failed to copy: " + err));
        return;
      }
    } catch (err) {
      isCopySuccessful = false;
    } finally {
      document.body.removeChild(textarea);
    }

    if (isCopySuccessful) {
      alert("Package summary copied to clipboard!");
    } else {
      alert("Failed to copy to clipboard.");
    }
  };

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
    img.src = "./adwait-logo.jpg";

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
        doc.text("For Reviews: Google Page | Follow Us:  Instagram", 107, 291, {
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
        styles: { fontSize: 9 },
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: 35 },
          1: { cellWidth: "auto" },
          2: { fontStyle: "bold", cellWidth: 35 },
          3: { cellWidth: "auto" },
        },
        margin: { left: 15, right: 15 },
      });
      currentY = doc.lastAutoTable.finalY;

      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Hotel Details", 15, currentY + 10);
      currentY += 12;

      autoTable(doc, {
        startY: currentY + 5,
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
            h.selectedRoomCategory,
            `${formatPdfDateInternal(h.checkInDate)} - ${formatPdfDateInternal(h.checkOutDate)}`,
            h.nights,
            MealPlans[h.selectedMealPlan] || h.selectedMealPlan,
          ];
        }),
        theme: "grid",
        headStyles: { fillColor: BRAND_COLOR_BLUE },
        styles: { fontSize: 9, cellPadding: 2 },
        margin: { left: 15, right: 15 },
        didDrawPage: (data) => {
          addHeader();
        },
        didParseCell: (data) => {
          if (data.section === "body" && data.column.index === 0) {
            const fullHotelData = data.cell.raw?._fullData;
            if (fullHotelData && fullHotelData.GoogleListingURL) {
              data.cell.styles.textColor = [0, 0, 255];
            }
          }
        },
        didDrawCell: (data) => {
          if (data.section === "body" && data.column.index === 0) {
            const fullHotelData = data.cell.raw?._fullData;
            if (fullHotelData && fullHotelData.GoogleListingURL) {
              doc.link(
                data.cell.x,
                data.cell.y,
                data.cell.width,
                data.cell.height,
                { url: fullHotelData.GoogleListingURL },
              );
            }
          }
        },
      });
      currentY = doc.lastAutoTable.finalY;

      autoTable(doc, {
        startY: currentY + 10,
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
        styles: { fontSize: 11, cellPadding: 3 },
        columnStyles: { 0: { cellWidth: 120 }, 1: { cellWidth: "auto" } },
        margin: { left: 15, right: 15 },
        didDrawPage: (data) => {
          addHeader();
        },
      });
      currentY = doc.lastAutoTable.finalY;

      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Inclusions & Exclusions", 15, currentY + 10);
      currentY += 12;
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
          "• All transfers and sightseeing by private " +
            (vehicle.name || vehicle.type) +
            (vehicle.ac ? " (AC)" : "") +
            " vehicle.",
        );
        includedItems.push(
          "• Toll, parking fees, driver allowance, and permits.",
        );
      }

      if (
        currentQuotationDataForPdf.activitySummary &&
        currentQuotationDataForPdf.activitySummary.length > 0
      ) {
        for (const activity of currentQuotationDataForPdf.activitySummary) {
          includedItems.push(
            `• ${activity.name} for ${activity.participants} participants.`,
          );
        }
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
        startY: currentY + 5,
        head: [["INCLUDED", "EXCLUDED"]],
        body: body,
        headStyles: { fillColor: BRAND_COLOR_BLUE, halign: "center" },
        theme: "grid",
        styles: { fontSize: 9, cellPadding: 2 },
        margin: { left: 15, right: 15 },
        didDrawPage: (data) => {
          addHeader();
        },
      });
      addFooter();
      doc.save(`Travel_Package_Quotation.pdf`);
    };

    img.onerror = () =>
      alert("Failed to generate PDF: Could not load company logo.");
  };

  const handleSavePackage = async () => {
    if (!packageName.trim()) return alert("Please enter a package name.");
    if (!customerName.trim()) return alert("Please enter a customer name.");

    try {
      const agentId = user?.uid;
      if (!agentId) throw new Error("Agent not logged in");

      const agentRef = doc(db, "saved_packages_by_agents", agentId);
      const packagesCollectionRef = collection(agentRef, "packages");

      const c_data = {
        ...(customerId
          ? { customerId, customerName }
          : leadId
            ? { leadId, leadName: customerName }
            : { customerName }),
      };

      const packageData = {
        packageName,
        ...c_data,
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

      toast("Package saved successfully!");
      router.push("./agent-panel/my-quatation");
      setShowSaveModal(false);
      dispatch(setPackageName(""));
    } catch (err) {
      console.error("Error saving package:", err);
      toast.error("Failed to save package: " + err.message);
    }
  };

  return (
    <div className="min-h-screen pb-12 md:pb-16">
      <div className="mx-auto p-0 md:px-4 lg:px-8">
        <div className="flex flex-col p-0 lg:flex-row lg:gap-8 xl:gap-10">
          {/* LEFT COLUMN - Main Content */}
          <div className="flex-1 space-y-8 lg:space-y-10 lg:pr-4 xl:pr-6 pb-8 lg:pb-0 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
            {/* 1. Date and Duration */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-6 p-2 md:p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="space-y-2">
                <Label
                  className="text-sm font-medium text-slate-700 flex items-center gap-2"
                  htmlFor="checkInDate"
                >
                  <Calendar className="w-4 h-4 text-theme-primary" /> Check-in
                  Date
                </Label>
                <Input
                  id="checkInDate"
                  type="date"
                  value={checkInDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setCheckInDate(e.target.value)}
                  className="focus:ring-theme-primary"
                />
              </div>

              <div className="space-y-2">
                <Label
                  className="text-sm font-medium text-slate-700"
                  htmlFor="nights"
                >
                  Nights
                </Label>
                <Input
                  id="nights"
                  type="number"
                  min={1}
                  value={nights}
                  onChange={(e) => setNights(e.target.value)}
                  className="focus:ring-theme-primary"
                />
              </div>

              <div className="space-y-2">
                <Label
                  className="text-sm font-medium text-slate-700"
                  htmlFor="checkOutDate"
                >
                  Check-out Date
                </Label>
                <Input
                  id="checkOutDate"
                  type="date"
                  value={checkOutDate}
                  min={checkInDate}
                  readOnly
                  className="bg-slate-50 cursor-not-allowed focus:ring-theme-primary"
                />
              </div>
              <div className="space-y-2">
                {/* 2. State Selection */}
                <label
                  className="text-sm font-medium text-slate-700 flex items-center gap-2"
                  htmlFor="stateSelect"
                >
                  <MapPin className="w-4 h-4 text-theme-primary" /> Select
                  Destination State
                </label>
                <select
                  id="stateSelect"
                  className="w-full p-2 border border-slate-200 rounded-md outline-none focus:ring-2 focus:ring-theme-primary"
                  value={selectedState}
                  onChange={(e) => {
                    setSelectedState(e.target.value);
                    setSelectedHotel(null);
                    setEditingIndex(null);
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
            </div>

            {/* 2. State Selection */}
            {/* <div className="p-6 bg-white rounded-xl border border-slate-200 space-y-4 shadow-sm"></div> */}

            {/* 3. Hotel Selection */}
            {selectedState && (
              <div className="p-2 md:p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-semibold text-theme-dark mb-4 flex items-center gap-2">
                  <Hotel className="w-5 h-5" /> Hotels in {selectedState}
                </h3>
                {filteredHotels.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    No hotels found in {selectedState}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 max-h-64 overflow-y-auto p-1">
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
                )}
              </div>
            )}

            {/* 4. Room Selection + Actions */}
            {selectedHotel ? (
              <div className="space-y-6">
                <div className="p-2 md:p-6 bg-white rounded-xl border border-theme-muted shadow-sm">
                  <HotelRoomSelector
                    hotel={hotels.find((h) => h.id === selectedHotel)}
                    checkInDate={checkInDate}
                    noOfNights={nights}
                    numDouble={numDouble}
                    setNumDouble={setNumDouble}
                    numExtraAdult={numExtraAdult}
                    setNumExtraAdult={setNumExtraAdult}
                    numExtraChild={numExtraChild}
                    setNumExtraChild={setNumExtraChild}
                    hotelTotal={hotelTotal}
                    numCNB={numCNB} 
                    setNumCNB={setNumCNB}
                    setHotelTotal={setHotelTotal}
                    setSelectedMealPlan={setSelectedMealPlan}
                    selectedMealPlan={selectedMealPlan}
                    setSelectedRoomCategory={setSelectedRoomCategory}
                    selectedRoomCategory={selectedRoomCategory}
                  />

                  <div className="flex flex-wrap gap-4 mt-8 pt-6 border-t border-slate-100">
                    <button
                      className="px-6 py-2.5 bg-theme-primary hover:bg-theme-secondary text-white rounded-md font-medium transition-all shadow-sm"
                      onClick={() => {
                        const selectedHotelFullData = hotels.find(
                          (h) => h.id === selectedHotel,
                        );
                        const currentHotelData = {
                          checkInDate,
                          nights,
                          checkOutDate,
                          state: selectedState,
                          hotel: selectedHotelFullData?.name || "N/A",
                          city: selectedHotelFullData?.city || "N/A",
                          GoogleListingURL:
                            selectedHotelFullData?.GoogleListingURL || null,
                          numDouble: numDouble[0],
                          numExtraAdult: numExtraAdult[0],
                          numExtraChild: numExtraChild[0],
                          hotelTotal: hotelTotal[0],
                          selectedMealPlan: selectedMealPlan,
                          selectedRoomCategory: selectedRoomCategory,
                        };

                        if (editingIndex !== null) {
                          dispatch(
                            updateHotelEntry({
                              index: editingIndex,
                              data: currentHotelData,
                            }),
                          );
                        } else {
                          dispatch(addHotelEntry(currentHotelData));
                        }

                        setSaveChanges(true);
                        setIsReadyToAddAnother(true);
                        setEditingIndex(null);
                      }}
                    >
                      {editingIndex !== null ? "Update Hotel" : "Save Hotel"}
                    </button>

                    {isReadyToAddAnother && (
                      <button
                        className="px-6 py-2.5 border border-theme-primary text-theme-primary hover:bg-theme-muted rounded-md font-medium transition-all"
                        onClick={() => {
                          setCheckInDate(checkOutDate);
                          setSelectedState("");
                          setSelectedHotel(null);
                          setNights(1);
                          setSelectedRoomCategory(null);
                          setSelectedMealPlan("");
                          setApplicableSeason(null);
                          setNumDouble([0]);
                          setNumExtraAdult([0]);
                          setNumExtraChild([0]);
                          setHotelTotal([0]);
                          setSaveChanges(false);
                          setIsReadyToAddAnother(false);
                          setEditingIndex(null);
                        }}
                      >
                        ➕ Add Another Hotel
                      </button>
                    )}
                  </div>
                </div>

                {/* Current Selection Summary */}
                {saveChanges && (
                  <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-md font-bold text-theme-dark mb-4">
                      Current Selection Summary
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-3 gap-x-6 text-sm">
                      <p>
                        <strong>Check-in:</strong> {formatDate(checkInDate)}
                      </p>
                      <p>
                        <strong>Nights:</strong> {nights}
                      </p>
                      <p>
                        <strong>Check-out:</strong> {formatDate(checkOutDate)}
                      </p>
                      <p>
                        <strong>Hotel:</strong>{" "}
                        {hotels.find((h) => h.id === selectedHotel)?.name}
                      </p>
                      <p>
                        <strong>Meal Plan:</strong>{" "}
                        {selectedMealPlan || "Not Selected"}
                      </p>
                      <p>
                        <strong>Total:</strong> ₹
                        {Number(hotelTotal[0] || 0).toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-10 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 shadow-sm">
                <p className="text-slate-500">
                  Please select a hotel to proceed with room selection.
                </p>
              </div>
            )}

            {/* 5. Saved Itinerary */}
            {hotelEntries.length > 0 && (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-theme-dark flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                  Saved Hotel Itinerary
                </h3>

                <div className="space-y-4">
                  {hotelEntries.map((entry, index) => (
                    <div
                      key={index}
                      className="p-2 md:p-5 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-2 flex-1">
                          <p className="font-bold text-lg text-theme-dark">
                            {entry.hotel}
                          </p>
                          <div className="flex flex-col md:flex-row flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="h-4 w-4 text-theme-primary" />
                              {formatDate(entry.checkInDate)} –{" "}
                              {formatDate(entry.checkOutDate)}
                            </span>
                            <span>•</span>
                            <span className="font-medium text-theme-primary">
                              {entry.nights} Night{entry.nights > 1 ? "s" : ""}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm font-medium text-slate-600">
                              Room:
                            </span>
                            <span className="text-sm font-medium text-theme-dark">
                              {entry.selectedRoomCategory || "—"}
                            </span>
                            <span className="text-sm text-slate-500">•</span>
                            <span className="text-sm font-medium text-slate-600">
                              Meal Plan:
                            </span>
                            <span className="text-sm font-medium text-theme-dark">
                              {entry.selectedMealPlan || "EP"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-6 sm:gap-8">
                          <div className="text-right min-w-[140px]">
                            <p className="text-xs text-slate-500">Total Cost</p>
                            <p className="text-2xl font-bold text-theme-primary mt-0.5">
                              ₹
                              {Number(entry.hotelTotal || 0).toLocaleString(
                                "en-IN",
                                {
                                  maximumFractionDigits: 0,
                                },
                              )}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              for {entry.nights} night
                              {entry.nights > 1 ? "s" : ""}
                            </p>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditHotel(index)}
                              className="p-2.5 text-slate-500 hover:text-theme-primary hover:bg-theme-muted/30 rounded-lg transition-colors"
                              title="Edit this hotel"
                            >
                              <Edit3 className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteHotel(index)}
                              className="p-2.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Remove this hotel"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 6. Transport */}
            <div className="p-6 bg-white rounded-xl border border-slate-200 space-y-4 shadow-sm">
              <h3 className="text-md font-bold flex items-center gap-2">
                <Car className="w-4 h-4" /> Transport
              </h3>
              {!showTransportSection ? (
                <button
                  className="w-full py-2.5 bg-theme-primary  rounded-lg hover:bg-theme-dark text-white "
                  onClick={() => setShowTransportSection(true)}
                >
                  Add Transport
                </button>
              ) : (
                <SelectTransport
                  onTransportSelect={(transport) =>
                    dispatch(setSelectedTransport(transport))
                  }
                />
              )}
            </div>

            {/* 7. Activities */}
            <div className="p-2 md:p-6 bg-white rounded-xl border border-slate-200 space-y-4 shadow-sm">
              <h3 className="text-md font-bold flex items-center gap-2">
                <Palmtree className="w-4 h-4" /> Activities
              </h3>
              <button
                className="w-full py-2.5 bg-theme-primary text-white rounded-lg hover:bg-theme-dark transition-all"
                onClick={() => setShowActivitiesSection(true)}
              >
                Add Activities
              </button>
              {showActivitiesSection && (
                <div className="mt-4 md:p-4 bg-slate-50 rounded-lg border border-slate-100">
                  <SelectActivities
                    selectedState={selectedState}
                    onDone={handleActivitiesDone}
                  />
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN - Sticky Pricing Panel */}
          {(selectedActivities.length > 0 ||
            hotelEntries.length > 0 ||
            selectedTransport) && (
            <div className="lg:w-96 xl:w-[420px] lg:min-w-[360px] lg:sticky lg:top-6 lg:self-start space-y-6 lg:pt-0 pt-8">
              {/* Markup Section */}
              <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-md">
                <h3 className="text-lg font-bold flex items-center gap-2 mb-5">
                  <Wallet className="w-5 h-5 text-theme-primary" /> Add Markup
                </h3>

                <div className="flex flex-wrap gap-3 items-end">
                  <div className="flex-1 min-w-[140px] space-y-1.5">
                    <Label className="text-xs font-medium text-slate-700">
                      Amount / %
                    </Label>
                    <Input
                      type="number"
                      className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-theme-primary outline-none"
                      value={markupAmount}
                      onChange={(e) => setMarkupAmount(Number(e.target.value))}
                    />
                  </div>

                  <select
                    className="p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-theme-primary outline-none h-[42px]"
                    value={markupType}
                    onChange={(e) => setMarkupType(e.target.value)}
                  >
                    <option value="lumpsum">Lumpsum (₹)</option>
                    <option value="percentage">Percentage (%)</option>
                  </select>

                  <button
                    className="bg-theme-secondary text-white px-6 py-2.5 rounded-lg font-medium hover:bg-theme-secondary/90 transition-colors whitespace-nowrap"
                    onClick={() => {
                      const base =
                        hotelTotalPrice +
                        (selectedTransport?.selectedVehicle?.price
                          ? Number(selectedTransport.selectedVehicle.price)
                          : 0) +
                        activityTotalPrice;

                      const markup =
                        markupType === "percentage"
                          ? (markupAmount / 100) * base
                          : markupAmount;

                      dispatch(setConfirmedMarkup(markup));
                    }}
                  >
                    Apply
                  </button>
                </div>

                <p className="mt-4 text-sm font-bold text-theme-dark">
                  Confirmed Markup: ₹
                  {confirmedMarkup.toLocaleString("en-IN", {
                    maximumFractionDigits: 0,
                  })}
                </p>
              </div>

              {/* Grand Total Card */}
              <div className="p-6 bg-theme-dark text-white rounded-xl shadow-xl space-y-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <IndianRupee className="h-5 w-5" />
                  Grand Total
                </h3>

                <div className="space-y-4 text-sm opacity-90">
                  <div className="flex justify-between items-center">
                    <span>Hotels</span>
                    <span className="font-medium">
                      ₹
                      {hotelTotalPrice.toLocaleString("en-IN", {
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span>Transport</span>
                    <span className="font-medium">
                      ₹
                      {transportTotalPrice.toLocaleString("en-IN", {
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span>Activities</span>
                    <span className="font-medium">
                      ₹
                      {activityTotalPrice.toLocaleString("en-IN", {
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-theme-accent font-medium">
                    <span>Markup</span>
                    <span>
                      ₹
                      {confirmedMarkup.toLocaleString("en-IN", {
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                </div>

                <hr className="border-white/20 my-5" />

                <div className="flex justify-between items-baseline">
                  <span className="font-bold text-lg">Final Total</span>
                  <span className="text-3xl font-black">
                    ₹
                    {grandTotal.toLocaleString("en-IN", {
                      maximumFractionDigits: 0,
                    })}
                  </span>
                </div>

                <button
                  className="w-full py-3.5 bg-theme-primary hover:bg-theme-secondary rounded-lg font-bold text-base transition-all mt-2 shadow-md flex items-center justify-center gap-2"
                  onClick={() => setShowSaveModal(true)}
                >
                  <Save className="h-5 w-5" />
                  Save Package
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Export buttons */}
        <div className="flex flex-wrap gap-4 pt-10 pb-6 border-t border-slate-100 mt-8">
          <button
            onClick={handleCopyToClipboard}
            className="flex items-center gap-2 px-6 py-2.5 bg-slate-800 text-white rounded-lg hover:bg-black transition-all shadow-sm"
          >
            <Copy className="w-4 h-4" />
            Copy Summary
          </button>
          <button
            onClick={handleExportToPDF}
            className="flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all shadow-sm"
          >
            <FileText className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50 ">
          <div className="bg-white p-8 rounded-xl w-full max-w-md shadow-2xl space-y-6">
            <h2 className="text-xl font-bold text-theme-dark border-b pb-2">
              Finalize Package
            </h2>
            <div className="space-y-4">
              <Input
                value={packageName}
                onChange={(e) => dispatch(setPackageName(e.target.value))}
                placeholder="Package Name (e.g. Goa Delight)"
                className="focus:ring-theme-primary"
              />
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Customer Name"
                disabled={!!customerId}
                className={`w-full p-3 border border-slate-200 rounded-lg 
                ${customerId ? "bg-slate-100 cursor-not-allowed" : ""}`}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowSaveModal(false)}>
                Cancel
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={handleSavePackage}
              >
                Save Package
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Create_new_package;
