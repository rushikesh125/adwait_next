"use client";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { db } from "@/firebase/config";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  deleteDoc,
  updateDoc,
  addDoc,
} from "firebase/firestore";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
// import AdwaitLogo from '../../../assets/Adwait tours logo.jpg';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGoogle, faInstagram } from "@fortawesome/free-brands-svg-icons";
import "@/app/globals.css"
// import './my_quotations.css';
import DeleteIcon from "@mui/icons-material/Delete";
import { useDispatch, useSelector } from "react-redux";
import { setLoading } from "@/store/authSlice";

const MyQuotations = () => {
  // --- 1. STATE HOOKS ---
  const [quotations, setQuotations] = useState([]);
  const [isFirstEdit, setisFirstEdit] = useState(true);
  const [allHotels, setAllHotels] = useState([]);
  const [toggleValue, setToggleValue] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingQuotation, setViewingQuotation] = useState(null);
  const [selectedHotelToAdd, setSelectedHotelToAdd] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDestination, setFilterDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const { user, loading } = useSelector((state) => state.auth);
  // States for Activities
  const [availableActivities, setAvailableActivities] = useState([]);
  const [isFetchingActivities, setIsFetchingActivities] = useState(false);
  const [selectedActivityToAdd, setSelectedActivityToAdd] = useState("");
    const dispatch = useDispatch();
  // States for Destinations (for filtering main list & adding hotels/activities)
  const [AllDestinations, setAllDestinations] = useState([]);
  const [SelectedDestination, setSelectedDestination] = useState(""); // Used for hotels and activities (general filter)

  // NEW: States for Transportation State/Packages
  const [transportStates, setTransportStates] = useState([]);
  const [selectedTransportStateId, setSelectedTransportStateId] = useState("");
  const [
    availableTransportPackagesForSelectedState,
    setAvailableTransportPackagesForSelectedState,
  ] = useState([]);

  const [editingQuotation, setEditingQuotation] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // --- 2. HELPER FUNCTIONS (NOT HOOKS) ---

  // Helper function for PDF date formatting (no hooks needed here)
  const formatPdfDate = (dateData) => {
    if (!dateData) return "N/A";
    const date = dateData.seconds
      ? new Date(dateData.seconds * 1000)
      : new Date(dateData);
    if (isNaN(date.getTime())) return "Invalid Date";
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Helper to get destination string for a package (no hooks needed here)
  const getDestinationOfpkg = (Quote) => {
    let resultString = "";

    if (
      !Quote ||
      !Array.isArray(Quote.hotelSummary) ||
      Quote.hotelSummary.length === 0
    ) {
      if (Quote?.transportSummary?.state) {
        return `${Quote.transportSummary.state} (Transport) \n`;
      }
      if (
        Array.isArray(Quote?.activitySummary) &&
        Quote.activitySummary.length > 0
      ) {
        const activityStatesCitiesMap = new Map();
        Quote.activitySummary.forEach((activity) => {
          const state = activity.state;
          const city = activity.city;
          if (state && city) {
            if (!activityStatesCitiesMap.has(state)) {
              activityStatesCitiesMap.set(state, new Set());
            }
            activityStatesCitiesMap.get(state).add(city);
          }
        });
        let activityDestinations = "";
        activityStatesCitiesMap.forEach((citiesSet, stateName) => {
          const citiesList = Array.from(citiesSet).sort().join(", ");
          activityDestinations += `${stateName} (${citiesList}) \n`;
        });
        return activityDestinations.trim() || "N/A";
      }
      return "N/A";
    }

    const stateCityMap = new Map();
    Quote.hotelSummary.forEach((hotel) => {
      const stateName = hotel.state;
      const cityName = hotel.city;
      if (stateName && cityName) {
        if (!stateCityMap.has(stateName)) {
          stateCityMap.set(stateName, new Set());
        }
        stateCityMap.get(stateName).add(cityName);
      }
    });

    stateCityMap.forEach((citiesSet, stateName) => {
      const citiesList = Array.from(citiesSet).sort().join(", ");
      resultString += `${stateName} (${citiesList}) \n`;
    });

    return resultString;
  };

  // --- 3. useCallback and useMemo Hooks ---

  // Memoized callback for getting available meal plans
  const getAvailableMealPlans = useCallback(
    (hotelSummaryEntry) => {
      if (!allHotels.length) return ["EP", "CP", "MAP", "AP"];

      const fullHotelData = allHotels.find(
        (h) =>
          h.name === hotelSummaryEntry.hotel &&
          h.city === hotelSummaryEntry.city &&
          h.state === hotelSummaryEntry.state
      );

      if (!fullHotelData || !Array.isArray(fullHotelData.rooms))
        return ["EP", "CP", "MAP", "AP"];

      const roomCategoryData = fullHotelData.rooms.find(
        (r) => r.categoryName === hotelSummaryEntry.selectedRoomCategory
      );

      if (!roomCategoryData || !Array.isArray(roomCategoryData.seasons))
        return ["EP", "CP", "MAP", "AP"];

      const checkInDateStr = hotelSummaryEntry.checkInDate;
      if (!checkInDateStr) return ["EP", "CP", "MAP", "AP"];

      const checkInDateObj = checkInDateStr.seconds
        ? new Date(checkInDateStr.seconds * 1000)
        : new Date(checkInDateStr);

      if (isNaN(checkInDateObj.getTime())) return ["EP", "CP", "MAP", "AP"];

      checkInDateObj.setHours(0, 0, 0, 0);

      const applicableSeason = roomCategoryData.seasons.find((season) => {
        const start = new Date(season.start);
        const end = new Date(season.end);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return checkInDateObj >= start && checkInDateObj <= end;
      });

      if (!applicableSeason || !applicableSeason.pricing)
        return ["EP", "CP", "MAP", "AP"];

      const mealPlanOptions = [];
      ["EP", "CP", "MAP", "AP"].forEach((plan) => {
        const planKey = plan.toLowerCase();
        const pricing = applicableSeason.pricing[planKey];
        if (
          pricing &&
          (pricing.double > 0 ||
            pricing.extraAdult > 0 ||
            pricing.extraChild > 0)
        ) {
          mealPlanOptions.push(plan);
        }
      });
      console.log(
        `Available meal plans for ${hotelSummaryEntry.hotel} room ${hotelSummaryEntry.selectedRoomCategory}:`,
        mealPlanOptions
      );
      return mealPlanOptions.length > 0 ? mealPlanOptions : ["EP"];
    },
    [allHotels]
  );
  // Memoized callback for fetching quotations
  const fetchQuotations = useCallback(async () => {
   
    const agentId =user?.uid;
    if (!agentId) {
      dispatch(setLoading(false));
      return;
    }

    try {
      const packagesRef = collection(
        db,
        "saved_packages_by_agents",
        agentId,
        "packages"
      );
      const q = query(packagesRef, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);

      const totalQuotations = snapshot.docs.length;

      const list = snapshot.docs
        .map((doc, index) => ({
          id: doc.id,
          quoteNumber: totalQuotations - index,
          ...doc.data(),
        }))
        .filter((quotation) => quotation.packageName !== null);

      setQuotations(list);
    } catch (error) {
      console.error("Error fetching quotations:", error);
    } finally {
      dispatch(setLoading(false));
    }
  }, []);

  // Memoized callback for general destination (used for filtering and adding new items)
  const getDestination = useCallback(() => {
    return SelectedDestination;
  }, [SelectedDestination]);

  // Memoized callback for calculating individual hotel price
  const calculateHotelPrice = useCallback((hotelEntry, fullHotelData) => {
    if (!hotelEntry || !fullHotelData) return 0;

    // Destructure everything we need directly from hotelEntry
    const {
      checkInDate,
      selectedRoomCategory,
      selectedMealPlan,
      numDouble,
      numExtraAdult,
      numExtraChild,
      nights = 1,
    } = hotelEntry;

    // 1. Find the Room Data for the selectedRoomCategory
    const roomData = fullHotelData.rooms.find(
      (r) => r.categoryName === selectedRoomCategory
    );
    if (!roomData || !Array.isArray(roomData.seasons)) return 0;

    // 2. Parse Check-in Date
    const checkInDateObj = checkInDate?.seconds
      ? new Date(checkInDate.seconds * 1000)
      : new Date(checkInDate);
    if (isNaN(checkInDateObj.getTime())) return 0;

    // Set hours to 0 to ensure date comparison works consistently
    checkInDateObj.setHours(0, 0, 0, 0);

    // 3. Find the Applicable Season
    const applicableSeason = roomData.seasons.find((season) => {
      const start = new Date(season.start);
      const end = new Date(season.end);
      start.setHours(0, 0, 0, 0); // Ensure consistent start of day
      end.setHours(23, 59, 59, 999); // Ensure consistent end of day
      return checkInDateObj >= start && checkInDateObj <= end;
    });

    if (!applicableSeason || !applicableSeason.pricing || !selectedMealPlan)
      return 0;

    // 4. Get pricing for the selected meal plan (make sure it's lowercase)
    const pricing = applicableSeason.pricing[selectedMealPlan.toLowerCase()];
    if (!pricing) {
      console.warn(
        `No pricing found for meal plan ${selectedMealPlan} in season for room category ${selectedRoomCategory}`
      );
      return 0; // Or handle as appropriate
    }

    // 5. Calculate total
    const doublePrice = (pricing.double || 0) * (numDouble || 0);
    const adultPrice = (pricing.extraAdult || 0) * (numExtraAdult || 0);
    const childPrice = (pricing.extraChild || 0) * (numExtraChild || 0);

    return (doublePrice + adultPrice + childPrice) * nights;
  }, []); // Dependencies: It should ideally re-run if allHotels changes, but here we pass fullHotelData explicitly.

  // Memoized callback for recalculating grand total
  const recalculateGrandTotal = useCallback((data) => {
    let hotelTotal =
      data.hotelSummary?.reduce(
        (sum, hotel) => sum + (hotel.hotelTotal || 0),
        0
      ) || 0;
    let transportTotal = 0;

    if (data.transportSummary) {
      if (data.transportSummary.pricingType === "perKm") {
        let kms = data.transportSummary?.kms || 0;
        transportTotal = kms * (data.transportSummary.perKmprice || 0);
      } else {
        transportTotal = data.transportSummary?.price || 0;
      }
    }
    const activityTotal =
      data.activitySummary?.reduce(
        (sum, act) => sum + (act.totalPrice || 0),
        0
      ) || 0;
    const markup = data.markup || 0;
    return hotelTotal + transportTotal + activityTotal + markup;
  }, []);

  // Memoized array for filtered quotations
  const filteredQuotations = useMemo(() => {
    return quotations.filter((q) => {
      const quotationDate = q.createdAt?.seconds
        ? new Date(q.createdAt.seconds * 1000)
        : null;

      const matchesSearch =
        searchTerm.toLowerCase() === "" ||
        q.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `quote ${q.quoteNumber}`.includes(searchTerm.toLowerCase()) ||
        q.packageName?.toLowerCase().includes(searchTerm.toLowerCase());

      const packageDestination = getDestinationOfpkg(q); // Now correctly defined above
      const matchesDestination =
        filterDestination === "" ||
        packageDestination.includes(filterDestination);

      const matchesStartDate =
        !startDate || (quotationDate && quotationDate >= new Date(startDate));
      const matchesEndDate =
        !endDate || (quotationDate && quotationDate <= new Date(endDate));

      return (
        matchesSearch &&
        matchesDestination &&
        matchesStartDate &&
        matchesEndDate
      );
    });
  }, [
    quotations,
    searchTerm,
    filterDestination,
    startDate,
    endDate,
    getDestinationOfpkg,
  ]); // Correct dependencies

  // --- 4. useEffect Hooks ---

  // Effect for initial data fetching (hotels, transport states, destinations)
  useEffect(() => {
    const fetchAllHotels = async () => {
      try {
        const hotelsSnapshot = await getDocs(collection(db, "hotels"));
        const hotelsList = hotelsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setAllHotels(hotelsList);
      } catch (error) {
        console.error("Error fetching all hotels:", error);
      }
    };

    const fetchAllTransportStates = async () => {
      try {
        const statesSnapshot = await getDocs(collection(db, "transport"));
        const statesList = statesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setTransportStates(statesList);
      } catch (error) {
        console.error("Error fetching all transport states:", error);
      }
    };

    const fetchAllDestinations = async () => {
      try {
        const destinationsSnapshot = await getDocs(collection(db, "locations"));
        const destinationsList = destinationsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setAllDestinations(destinationsList);
      } catch (error) {
        console.error("Error fetching all destinations:", error);
      }
    };

    fetchAllDestinations();
    fetchAllTransportStates();
    fetchAllHotels();
  }, []); // Empty dependency array means runs once on mount

  // Effect for fetching quotations on mount or when fetchQuotations changes
  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  // Effect for fetching activities and transport packages when edit modal is open or selected states change
  useEffect(() => {
    if (!isEditModalOpen || !editingQuotation) {
      setAvailableActivities([]);
      setSelectedTransportStateId("");
      setAvailableTransportPackagesForSelectedState([]);
      return;
    }

    if (isFirstEdit) {
      if (editingQuotation?.transportSummary?.state) {
        setSelectedTransportStateId(editingQuotation.transportSummary.state);
        setToggleValue(editingQuotation.transportSummary.isCustom || false);
      } else {
        setSelectedTransportStateId("");
        setToggleValue(false);
      }
      setisFirstEdit(false);
    }

    const currentActivityState = SelectedDestination;
    if (currentActivityState && currentActivityState !== "N/A") {
      const fetchActivities = async () => {
        setIsFetchingActivities(true);
        try {
          const q = query(
            collection(db, "activities"),
            where("state", "==", currentActivityState)
          );
          const snapshot = await getDocs(q);
          setAvailableActivities(
            snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
          );
        } catch (error) {
          console.error("Error fetching activities:", error);
        } finally {
          setIsFetchingActivities(false);
        }
      };
      fetchActivities();
    } else {
      setAvailableActivities([]);
    }

    const fetchTransportPackages = async () => {
      if (selectedTransportStateId) {
        try {
          const transportPackagesRef = collection(
            db,
            "transport",
            selectedTransportStateId,
            "packages"
          );
          const snapshot = await getDocs(transportPackagesRef);
          const fetchedPackages = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setAvailableTransportPackagesForSelectedState(fetchedPackages);
        } catch (error) {
          console.error(
            `Error fetching transport packages for ${selectedTransportStateId}:`,
            error
          );
          setAvailableTransportPackagesForSelectedState([]);
        }
      } else {
        setAvailableTransportPackagesForSelectedState([]);
      }
    };

    fetchTransportPackages();
  }, [
    isEditModalOpen,
    editingQuotation,
    SelectedDestination,
    selectedTransportStateId,
    isFirstEdit,
  ]);

  // --- 5. Event Handlers ---

  const handleToggle = () => {
    setToggleValue((prev) => {
      const newToggleValue = !prev; // The new value of toggleValue

      setEditingQuotation((prevQuot) => {
        const newTransportSummary = { ...prevQuot.transportSummary };
        if (newToggleValue === true) {
          // If toggling TO Custom
          newTransportSummary.isCustom = true;
          newTransportSummary.packageName = "";
          newTransportSummary.id = "";
          newTransportSummary.vehicles = [];
          newTransportSummary.selectedVehicle = null;
          newTransportSummary.pricingType = "fixed";
          newTransportSummary.price = 0;
          newTransportSummary.perKmprice = 0;
          newTransportSummary.ac = false;
          newTransportSummary.totalPrice = 0;
          // You might want to clear selectedTransportStateId here too if it makes sense
          // setSelectedTransportStateId('');
        } else {
          // If toggling TO Package Service
          newTransportSummary.isCustom = false;
          // No need to clear other fields, they'll be overwritten by package selection
        }
        const updatedQuotation = {
          ...prevQuot,
          transportSummary: newTransportSummary,
        };
        const newGrandTotal = recalculateGrandTotal(updatedQuotation);
        return { ...updatedQuotation, grandTotal: newGrandTotal };
      });
      return newToggleValue; // Return the new value for setToggleValue
    });
  };

  const handleViewClick = (quotation) => {
    setViewingQuotation(quotation);
    setIsViewModalOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleEditClick = async (quotation) => {
    const deepCopy = JSON.parse(JSON.stringify(quotation));
    setEditingQuotation(deepCopy);
    setIsEditModalOpen(true);
    setisFirstEdit(true); // Reset flag for new edit session
    window.scrollTo({ top: 0, behavior: "smooth" });

    if (deepCopy.hotelSummary && deepCopy.hotelSummary.length > 0) {
      setSelectedDestination(deepCopy.hotelSummary[0].state);
    } else {
      setSelectedDestination("");
    }
    // selectedTransportStateId will be set by the useEffect when isFirstEdit is true
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditingQuotation((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleMarkupInputChange = (value) => {
    setEditingQuotation((prev) => {
      const newMarkup = parseFloat(value) || 0;
      const updatedQuotation = { ...prev, markup: newMarkup };
      const newGrandTotal = recalculateGrandTotal(updatedQuotation);
      return { ...updatedQuotation, grandTotal: newGrandTotal };
    });
  };

  const handleUpdateQuotation = async () => {
    if (!editingQuotation) {
      alert("No quotation selected for update.");
      return;
    }

    
    const agentId = user?.uid;
    if (!agentId) {
      alert("Error: You must be logged in to update a quotation.");
      return;
    }

    const quotationRef = doc(
      db,
      "saved_packages_by_agents",
      agentId,
      "packages",
      editingQuotation.id
    );

    try {
      await updateDoc(quotationRef, editingQuotation);

      alert("Quotation updated successfully! ✅");
      setIsEditModalOpen(false);
      fetchQuotations();
    } catch (error) {
      console.error("Error updating quotation: ", error);
      alert("Failed to update quotation. Please check the console for errors.");
    }
  };

  const handleDownloadPDF = (quotation) => {
    // --- Defensive Check ---
    if (
      !quotation ||
      !quotation.hotelSummary ||
      quotation.hotelSummary.length === 0
    ) {
      alert(
        "Cannot generate PDF: Quotation data is incomplete or has no hotels."
      );
      return;
    }

    const doc = new jsPDF();
    const BRAND_COLOR_BLUE = "#0D47A1";
    const HEADER_TEXT_COLOR = "#444444";
    const FONT_SIZE_NORMAL = 9;
    const FONT_SIZE_SMALL = 8;
    const pageContentWidth = 180; // Usable width between margins (210 - 15*2 = 180)

    const img = new Image();
    img.src = "./adwait-logo.jpg";

    img.onload = () => {
      // Inside your handleDownloadPDF function, locate the addHeader function

      // Inside your handleDownloadPDF function, locate the addHeader function

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

        doc.setFontSize(FONT_SIZE_SMALL); // 8pt
        doc.setTextColor(HEADER_TEXT_COLOR);

        const contactBlockX = 160;
        let contactLineY = logoY + 4;

        const phoneNumber = "+91 9884798483";
        const phoneLink = `tel:${phoneNumber.replace(/ /g, "")}`; // Remove spaces for the tel: link
        const phoneLabel = "Phone: ";
        const phoneText = `${phoneLabel}${phoneNumber}`;

        // Calculate text dimensions to correctly place the link
        const phoneTextWidth =
          (doc.getStringUnitWidth(phoneText) * FONT_SIZE_SMALL) /
          doc.internal.scaleFactor;
        const phoneTextHeight =
          (FONT_SIZE_SMALL / doc.internal.scaleFactor) * 1.15; // Approximate line height

        // Set black color and bold for phone label
        doc.setTextColor(0, 0, 0); // Black color
        doc.setFont(undefined, "bold");
        doc.text(phoneLabel, contactBlockX, contactLineY, { align: "left" });

        // Set blue color for phone number
        doc.setTextColor(0, 0, 255); // Blue color
        doc.setFont(undefined, "normal");
        doc.text(
          phoneNumber,
          contactBlockX +
            (doc.getStringUnitWidth(phoneLabel) * FONT_SIZE_SMALL) /
              doc.internal.scaleFactor,
          contactLineY,
          { align: "left" }
        );

        // Add the clickable link area over the phone number text
        // doc.link(x, y, width, height, options)
        // x, y are top-left coordinates of the link rectangle
        // width, height are the dimensions of the link rectangle
        // For left-aligned text, use contactBlockX as the starting point
        doc.link(
          contactBlockX,
          contactLineY - phoneTextHeight + 1,
          phoneTextWidth,
          phoneTextHeight,
          { url: phoneLink }
        );

        contactLineY += 5;
        const emailAddress = "sales@adwaittours.com";
        const emailLink = `mailto:${emailAddress}`;
        const emailLabel = "Email: ";
        const emailText = `${emailLabel}${emailAddress}`;
        const emailTextWidth =
          (doc.getStringUnitWidth(emailText) * FONT_SIZE_SMALL) /
          doc.internal.scaleFactor;

        // Set black color and bold for email label
        doc.setTextColor(0, 0, 0); // Black color
        doc.setFont(undefined, "bold");
        doc.text(emailLabel, contactBlockX, contactLineY, { align: "left" });

        // Set blue color for email address
        doc.setTextColor(0, 0, 255); // Blue color
        doc.setFont(undefined, "normal");
        doc.text(
          emailAddress,
          contactBlockX +
            (doc.getStringUnitWidth(emailLabel) * FONT_SIZE_SMALL) /
              doc.internal.scaleFactor,
          contactLineY,
          { align: "left" }
        );
        doc.link(
          contactBlockX - emailTextWidth,
          contactLineY - phoneTextHeight + 1,
          emailTextWidth,
          phoneTextHeight,
          { url: emailLink }
        );

        contactLineY += 5;
        const webAddress = "www.adwaittours.com";
        const webLink = `https://${webAddress}`; // Ensure https for proper linking
        const webLabel = "Web: ";
        const webText = `${webLabel}${webAddress}`;
        const webTextWidth =
          (doc.getStringUnitWidth(webText) * FONT_SIZE_SMALL) /
          doc.internal.scaleFactor;

        // Set black color and bold for web label
        doc.setTextColor(0, 0, 0); // Black color
        doc.setFont(undefined, "bold");
        doc.text(webLabel, contactBlockX, contactLineY, { align: "left" });

        // Set blue color for web address
        doc.setTextColor(0, 0, 255); // Blue color
        doc.setFont(undefined, "normal");
        doc.text(
          webAddress,
          contactBlockX +
            (doc.getStringUnitWidth(webLabel) * FONT_SIZE_SMALL) /
              doc.internal.scaleFactor,
          contactLineY,
          { align: "left" }
        );
        doc.link(
          contactBlockX - webTextWidth,
          contactLineY - phoneTextHeight + 1,
          webTextWidth,
          phoneTextHeight,
          { url: webLink }
        );

        const finalHeaderBottomY =
          Math.max(logoY + logoHeight, sloganY, contactLineY) + 5;
        doc.setDrawColor("#CCCCCC");
        doc.setLineWidth(0.2);
        doc.line(15, finalHeaderBottomY, 200, finalHeaderBottomY);
      };

      const addFooter = () => {
        // --- Separator Line ---
        doc.setDrawColor("#CCCCCC");
        doc.setLineWidth(0.2);
        doc.line(15, 282, 200, 282);

        // --- Thank You Text ---
        doc.setFontSize(FONT_SIZE_SMALL);
        doc.setTextColor(HEADER_TEXT_COLOR);
        doc.text("Thank you for choosing Adwait Tours!", 107, 287, {
          align: "center",
        });

        // --- Links Section ---
        const linkY = 291;
        const googleLinkText = "For Reviews: Google Page";
        const instagramLinkText = "Follow Us: Instagram";
        const separator = " | ";

        const fullText = googleLinkText + separator + instagramLinkText;
        const fullWidth =
          (doc.getStringUnitWidth(fullText) * FONT_SIZE_SMALL) /
          doc.internal.scaleFactor;

        // starting X for center alignment
        const startX = 107 - fullWidth / 2;

        // === Google Link ===
        const googleLinkWidth =
          (doc.getStringUnitWidth(googleLinkText) * FONT_SIZE_SMALL) /
          doc.internal.scaleFactor;

        doc.setTextColor(0, 0, 255); // blue
        doc.text(googleLinkText, startX, linkY);
        doc.setDrawColor(0, 0, 255);
        doc.setLineWidth(0.2);
        doc.line(startX, linkY + 1, startX + googleLinkWidth, linkY + 1);
        doc.link(
          startX,
          linkY - FONT_SIZE_SMALL,
          googleLinkWidth,
          FONT_SIZE_SMALL,
          {
            url: "https://share.google/gpnOuOQxhD49T77Yw",
          }
        );

        // === Separator ===
        doc.setTextColor(HEADER_TEXT_COLOR);
        const sepX = startX + googleLinkWidth;
        doc.text(separator, sepX, linkY);

        // === Instagram Link ===
        const instagramLinkWidth =
          (doc.getStringUnitWidth(instagramLinkText) * FONT_SIZE_SMALL) /
          doc.internal.scaleFactor;

        const instaX =
          sepX +
          (doc.getStringUnitWidth(separator) * FONT_SIZE_SMALL) /
            doc.internal.scaleFactor;

        doc.setTextColor(0, 0, 255); // blue
        doc.text(instagramLinkText, instaX, linkY);
        doc.setDrawColor(0, 0, 255);
        doc.line(instaX, linkY + 1, instaX + instagramLinkWidth, linkY + 1);
        doc.link(
          instaX,
          linkY - FONT_SIZE_SMALL,
          instagramLinkWidth,
          FONT_SIZE_SMALL,
          {
            url: "https://www.instagram.com/adwaittours?igsh=MW11cGRldWR4aGJxdQ==",
          }
        );

        // Reset text color back
        doc.setTextColor(HEADER_TEXT_COLOR);
      };

      // --- START BUILDING DOCUMENT ---
      addHeader();
      let currentY = 32;
      currentY += 20;

      // --- GUEST INFO TABLE ---
      const firstHotel = quotation.hotelSummary[0]; // Assuming at least one hotel exists

      // Calculate travel dates (first and last dates from hotel details)
      let travelStartDate = "";
      let travelEndDate = "";

      if (quotation.hotelSummary && quotation.hotelSummary.length > 0) {
        // Get the first hotel's check-in date
        travelStartDate = formatPdfDate(quotation.hotelSummary[0].checkInDate);

        // Get the last hotel's check-out date
        const lastHotel =
          quotation.hotelSummary[quotation.hotelSummary.length - 1];
        travelEndDate = formatPdfDate(lastHotel.checkOutDate);
      }
      autoTable(doc, {
        startY: currentY, // Start below header
        body: [
          // Customer Name and Quotation Date in the first row
          [
            "Customer Name:",
            quotation.customerName || "N/A",
            "Quotation Date:",
            formatPdfDate(new Date()),
          ],
          // Travel Dates and Destination in the second row
          [
            "Travel Dates:",
            `${travelStartDate} - ${travelEndDate}`,
            "No. of Guests:",
            `${firstHotel.numDouble || 0} Couple(s), ${
              firstHotel.numExtraAdult || 0
            } Adult(s), ${firstHotel.numExtraChild || 0} Child(ren)`,
            "",
            "",
          ],
          // Guests in the third row
          ["Destination:", getDestinationOfpkg(quotation)],
        ],
        theme: "plain",
        styles: { fontSize: FONT_SIZE_NORMAL },
        // Adjusted columnStyles to distribute space for 4 columns
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: 35 }, // Label for Customer Name / Travel Dates / Guests
          1: { cellWidth: "auto" }, // Value for Customer Name / Travel Dates / Guests
          2: { fontStyle: "bold", cellWidth: 35 }, // Label for Quotation Date / Destination / Space
          3: { cellWidth: "auto" }, // Value for Quotation Date / Destination / Space
        },
        margin: { left: 15, right: 15 },
      });
      currentY = doc.lastAutoTable.finalY;

      const MealPlans = {
        EP: "Accommodation only",
        CP: "Breakfast only",
        MAP: "Breakfast and Dinner",
        AP: "Breakfast, Lunch and Dinner",
      };

      // --- HOTEL DETAILS TABLE ---
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Hotel Details", 15, currentY + 10);
      currentY += 12;

      autoTable(doc, {
        startY: currentY + 5,
        head: [
          ["Hotel Name", "City", "Room Type", "Dates", "Nights", "Meal Plan"],
        ],
        body: quotation.hotelSummary.map((h) => {
          const fullHotelData = allHotels.find(
            (hotel) =>
              hotel.name === h.hotel &&
              hotel.city === h.city &&
              hotel.state === h.state
          );
          return [
            { content: h.hotel, _fullData: fullHotelData },
            h.city,
            h.selectedRoomCategory,
            `${formatPdfDate(h.checkInDate)} - ${formatPdfDate(
              h.checkOutDate
            )}`,
            h.nights,
            MealPlans[h.selectedMealPlan] || h.selectedMealPlan,
          ];
        }),
        theme: "grid",
        headStyles: { fillColor: BRAND_COLOR_BLUE },
        styles: { fontSize: FONT_SIZE_NORMAL, cellPadding: 2 },
        // This is the key change:
        columnStyles: {
          // Column 4 is 'Nights' (0-indexed)
          4: { halign: "center" },
        },
        margin: { left: 15, right: 15 },
        didDrawPage: (data) => {
          addHeader();
        },
        didParseCell: (data) => {
          if (data.section === "body" && data.column.index === 0) {
            const fullHotelData = data.cell.raw?._fullData;
            if (fullHotelData && fullHotelData.GoogleListingURL) {
              data.cell.styles.textColor = [0, 0, 255]; // Blue color for link
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
                { url: fullHotelData.GoogleListingURL }
              );
            }
          }
        },
      });
      currentY = doc.lastAutoTable.finalY;

      // // --- ACTIVITY DETAILS ---
      // if (quotation.activitySummary && quotation.activitySummary.length > 0) {
      //      doc.setFontSize(11);
      //      doc.setFont('helvetica', 'bold');
      //      doc.text('Activity Details', 15, currentY + 10);
      //      currentY += 12;

      //      autoTable(doc, {
      //          startY: currentY + 5,
      //          head: [['Activity Name', 'Location', 'Participants']],
      //          body: quotation.activitySummary.map(act => [
      //              act.name,
      //              `${act.city}, ${act.state}`,
      //              `${act.participants || 0} Person(s)`,
      //          ]),
      //          theme: 'grid',
      //          headStyles: { fillColor: BRAND_COLOR_BLUE },
      //          styles: { fontSize: FONT_SIZE_NORMAL, cellPadding: 2 },
      //          margin: { left: 15, right: 15 },
      //          didDrawPage: (data) => { addHeader(); }
      //      });
      //      currentY = doc.lastAutoTable.finalY;
      // }

      const totalHotelCost = quotation.hotelSummary.reduce(
        (sum, h) => sum + (h.hotelTotal || 0),
        0
      );

      let totalTransportCost = 0;
      if (quotation.transportSummary) {
        if (quotation.transportSummary.pricingType === "perKm") {
          totalTransportCost =
            (quotation.transportSummary.perKmprice || 0) *
            (quotation.transportSummary.kms || 0);
        } else {
          totalTransportCost = quotation.transportSummary.price || 0;
        }
      }

      const totalActivityCost =
        quotation.activitySummary?.reduce(
          (sum, act) => sum + (act.totalPrice || 0),
          0
        ) || 0;
      const totalMarkup = quotation.markup || 0;
      const calculatedGrandTotal =
        totalHotelCost + totalTransportCost + totalActivityCost + totalMarkup;

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
              content: `Rs. ${calculatedGrandTotal.toLocaleString("en-IN", {
                maximumFractionDigits: 0,
              })}/-`,
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
        didDrawPage: (data) => {
          addHeader();
        },
      });
      currentY = doc.lastAutoTable.finalY;
      // --- INCLUDED / EXCLUDED ---
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Inclusions & Exclusions", 15, currentY + 10);
      currentY += 12;

      const columnWidth = pageContentWidth / 2 - 5;

      const includedItems = ["• Hotel accommodation as specified."];

      // Calculate total meals based on selected meal plans
      let totalBreakfasts = 0;
      let totalLunches = 0;
      let totalDinners = 0;

      quotation.hotelSummary.forEach((hotel) => {
        const nights = parseInt(hotel.nights) || 1;

        switch (hotel.selectedMealPlan) {
          case "CP":
            totalBreakfasts = totalBreakfasts + nights;
            break;
          case "MAP":
            totalBreakfasts = totalBreakfasts + nights;
            totalDinners = totalDinners + nights;
            break;
          case "AP":
            totalBreakfasts = totalBreakfasts + nights;
            totalLunches = totalLunches + nights;
            totalDinners = totalDinners + nights;
            break;
          default:
            break;
        }
      });

      // Add meal items as a single line with commas
      const mealItems = [];
      if (totalBreakfasts > 0) {
        mealItems.push(`${totalBreakfasts} Breakfast(s)`);
      }
      if (totalLunches > 0) {
        mealItems.push(`${totalLunches} Lunch(es)`);
      }
      if (totalDinners > 0) {
        mealItems.push(`${totalDinners} Dinner(s)`);
      }

      if (mealItems.length > 0) {
        includedItems.push(`• ${mealItems.join(", ")}`);
      }
      if (quotation.transportSummary?.vehicleName) {
        if (quotation.transportSummary?.ac) {
          includedItems.push(
            "• All transfers and sightseeing by private - " +
              quotation.transportSummary.vehicleName +
              " (AC) vehicle."
          );
        } else {
          includedItems.push(
            "• All transfers and sightseeing by private - " +
              quotation.transportSummary.vehicleName +
              " vehicle."
          );
        }
        if (quotation.activitySummary) {
          for (let i = 0; i < quotation.activitySummary.length; i++) {
            includedItems.push(
              "• " +
                quotation.activitySummary[i].name +
                " for  " +
                quotation.activitySummary[i].participants +
                " participants."
            );
          }
        }
        includedItems.push(
          "• Toll, parking fees, driver allowance, and permits."
        );
      }

      const excludedItems = [
        "• Train / Flight Fare.",
        "• Early check-in & late check-out as per hotel policy.",
        '• Any items not mentioned in the "Included" section.',
      ];

      const wrappedIncluded = includedItems.map((item) =>
        doc.splitTextToSize(item)
      );
      const wrappedExcluded = excludedItems.map((item) =>
        doc.splitTextToSize(item)
      );

      const body = [];
      const maxLength = Math.max(
        wrappedIncluded.length,
        wrappedExcluded.length
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
        styles: { fontSize: FONT_SIZE_NORMAL, cellPadding: 2 },
        margin: { left: 15, right: 15 },
        didDrawPage: (data) => {
          addHeader();
        },
      });
      currentY = doc.lastAutoTable.finalY;

      addFooter();
      doc.save(`Quotation-${quotation.customerName.replace(/ /g, "_")}.pdf`);
    };

    img.onerror = () =>
      alert("Failed to generate PDF: Could not load company logo.");
  };

  const handleAddHotel = () => {
    if (!selectedHotelToAdd) {
      alert("Please select a hotel to add.");
      return;
    }

    const newHotelData = allHotels.find((h) => h.id === selectedHotelToAdd);
    if (!newHotelData) return;

    const isAlreadyAdded = editingQuotation.hotelSummary.some(
      (h) => h.hotel === newHotelData.name
    );
    if (isAlreadyAdded) {
      alert(`${newHotelData.name} is already in the quotation.`);
      return;
    }

    const newHotelEntry = {
      hotel: newHotelData.name,
      city: newHotelData.city,
      state: newHotelData.state,
      nights: 1,
      numDouble: 1,
      numExtraAdult: 0,
      numExtraChild: 0,
      checkInDate: new Date().toISOString().split("T")[0],
      selectedRoomCategory: newHotelData.rooms[0]?.categoryName || "",
      selectedMealPlan: "EP",
      hotelTotal: 0,
    };

    newHotelEntry.hotelTotal = calculateHotelPrice(newHotelEntry, newHotelData);

    setEditingQuotation((prev) => {
      const updatedSummary = [...prev.hotelSummary, newHotelEntry];
      const updatedQuotation = { ...prev, hotelSummary: updatedSummary };
      updatedQuotation.hotelTotal = updatedSummary.reduce(
        (sum, hotel) => sum + (hotel.hotelTotal || 0),
        0
      );
      return {
        ...updatedQuotation,
        grandTotal: recalculateGrandTotal(updatedQuotation),
      };
    });

    setSelectedHotelToAdd("");
  };

  const handleRemoveHotel = (indexToRemove) => {
    if (editingQuotation.hotelSummary.length <= 1) {
      alert("A quotation must have at least one hotel.");
      return;
    }

    setEditingQuotation((prev) => {
      const updatedSummary = prev.hotelSummary.filter(
        (_, index) => index !== indexToRemove
      );
      const updatedQuotation = { ...prev, hotelSummary: updatedSummary };
      updatedQuotation.hotelTotal = updatedSummary.reduce(
        (sum, hotel) => sum + (hotel.hotelTotal || 0),
        0
      );
      return {
        ...updatedQuotation,
        grandTotal: recalculateGrandTotal(updatedQuotation),
      };
    });
  };
  const handleHotelSummaryChange = (index, name, value) => {
    setEditingQuotation((prev) => {
      // Create a deep copy to avoid mutation issues
      const updatedSummary = JSON.parse(JSON.stringify(prev.hotelSummary));

      // --- 1. APPLY THE INITIAL CHANGE ---
      // Apply the direct change made by the user (e.g., updating nights)
      // Ensure numbers are stored as numbers
      const isNumericField = [
        "nights",
        "numDouble",
        "numExtraAdult",
        "numExtraChild",
      ].includes(name);
      updatedSummary[index][name] = isNumericField
        ? parseInt(value, 10) || 0
        : value;

      // --- 2. LOGIC FOR CASCADING DATE UPDATES ---
      // This block runs if a date or duration is changed, affecting subsequent hotels.
      if (name === "nights" || name === "checkInDate") {
        for (let i = index; i < updatedSummary.length; i++) {
          const currentEntry = updatedSummary[i];
          let checkInDate;

          if (i === index) {
            // For the hotel that was directly edited, its check-in date is the source of truth.
            // We just need to parse it into a valid Date object for calculations.
            const rawCheckIn = currentEntry.checkInDate;
            checkInDate = rawCheckIn.seconds
              ? new Date(rawCheckIn.seconds * 1000)
              : new Date(rawCheckIn);
          } else {
            // For all subsequent hotels, the check-in date is the PREVIOUS hotel's check-out date.
            const prevCheckOutString = updatedSummary[i - 1].checkOutDate;
            checkInDate = new Date(prevCheckOutString);
            // Update the checkInDate field for the current hotel in the loop
            updatedSummary[i].checkInDate = checkInDate
              .toISOString()
              .split("T")[0];
          }

          // Now, calculate the new check-out date for the current hotel (at index i)
          const nights = parseInt(currentEntry.nights, 10) || 1;
          const checkOutDate = new Date(checkInDate);
          checkOutDate.setDate(checkOutDate.getDate() + nights); // Correctly add the number of nights

          // Update the checkOutDate field in the summary
          updatedSummary[i].checkOutDate = checkOutDate
            .toISOString()
            .split("T")[0];
        }
      }

      // --- 3. LOGIC TO RESET MEAL PLAN IF ROOM CATEGORY CHANGES ---
      // (This is your existing logic, which is good to keep)
      if (name === "selectedRoomCategory") {
        const entryToUpdate = updatedSummary[index];
        const currentHotelData = allHotels.find(
          (h) => h.name === entryToUpdate.hotel && h.city === entryToUpdate.city
        );
        if (currentHotelData) {
          const availablePlans = getAvailableMealPlans(entryToUpdate);
          if (!availablePlans.includes(entryToUpdate.selectedMealPlan)) {
            entryToUpdate.selectedMealPlan = availablePlans[0] || "EP";
          }
        }
      }

      // --- 4. RECALCULATE PRICES AND TOTALS FOR THE ENTIRE SUMMARY ---
      // We recalculate all prices since dates could have shifted, affecting pricing seasons.
      const finalSummaryWithPrices = updatedSummary.map((entry) => {
        const fullHotelData = allHotels.find(
          (h) =>
            h.name === entry.hotel &&
            h.city === entry.city &&
            h.state === entry.state
        );
        const newPrice = fullHotelData
          ? calculateHotelPrice(entry, fullHotelData)
          : 0;
        return { ...entry, hotelTotal: newPrice };
      });

      const updatedQuotation = {
        ...prev,
        hotelSummary: finalSummaryWithPrices,
      };
      const newGrandTotal = recalculateGrandTotal(updatedQuotation);

      return { ...updatedQuotation, grandTotal: newGrandTotal };
    });
  };

  const toTitleCase = (str) => {
    if (!str) return "";
    return str
      .replace(/-/g, " ") // Replace hyphens with spaces first
      .toLowerCase() // Convert to lowercase to handle fully uppercase cases
      .split(" ") // Split by space into an array of words
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize first letter of each word
      .join(" "); // Join words back with spaces
  };

  const handleTransportSummaryChange = (name, value) => {
    setEditingQuotation((prev) => {
      const updatedTransportSummary = prev.transportSummary
        ? { ...prev.transportSummary }
        : {};
      updatedTransportSummary[name] = value;

      const updatedQuotation = {
        ...prev,
        transportSummary: updatedTransportSummary,
      };
      const newGrandTotal = recalculateGrandTotal(updatedQuotation);
      return {
        ...updatedQuotation,
        grandTotal: newGrandTotal,
      };
    });
  };

  const generatePackageSummary = (quotationData) => {
    // Now accepts quotationData as an argument
    if (quotationData.hotelSummary.length === 0)
      return "Hotel details not available.";

    const firstEntry = quotationData.hotelSummary[0]; // Used for common details like guest info and start date
    const formatDate = (dateData) => {
      // Helper function for date formatting
      const date = dateData.seconds
        ? new Date(dateData.seconds * 1000)
        : new Date(dateData);
      return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    };

    const startDate = formatDate(firstEntry.checkInDate);

    let summary = "";

    // ✉️ Greeting
    summary += `Dear Guests,\n\n`;
    summary += `Greetings from Adwait Tours!!\n`;
    summary += `Kindly find the best possible rates for your requirement starting ${startDate}\n`;

    // 🧍 Guest Info (using first hotel's guest count as an example, ideally this would be a separate input)
    summary += `${firstEntry.numDouble || 0} Couple\n`;
    summary += `${firstEntry.numExtraChild || 0} Extra Child With Matress\n`;
    summary += `${firstEntry.numExtraAdult || 0} Extra Adult With Matress\n\n`;

    // 🏨 Hotels Section
    summary += ` *HOTELS*\n`;
    quotationData.hotelSummary.forEach((entry, index) => {
      // Find the full hotel data from allHotels to get GoogleListingURL
      const hotelFullDetails = allHotels.find(
        (h) =>
          h.name === entry.hotel &&
          h.city === entry.city &&
          h.state === entry.state
      );

      const hotelCheckIn = formatDate(entry.checkInDate);
      const hotelCheckOut = formatDate(entry.checkOutDate);
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

      summary += `${index + 1}. ${entry.hotel.toUpperCase()} ${
        hotelFullDetails?.GoogleListingURL || ""
      }\n`; // Use ?. for safety
      summary += ` ⇒ ${entry.city}, ${entry.state}\n`;
      summary += ` ⇒ Hotel Room Count: ${roomCount} Hotel Room Category: ${roomCategory}\n`;
      summary += ` ⇒ ${hotelCheckIn} to ${hotelCheckOut} (${hotelNights} Nights, ${mealPlanDescriptions[mealPlan]})\n\n`;
    });

    // Function to calculate total meals for inclusion section
    const calculateTotalMeals = () => {
      let totalBreakfasts = 0;
      let totalLunches = 0;
      let totalDinners = 0;

      quotationData.hotelSummary.forEach((hotel) => {
        // const guestMultiplier = (hotel.numDouble || 0) * 2 + (hotel.numExtraAdult || 0) + (hotel.numExtraChild || 0);
        switch (hotel.selectedMealPlan) {
          case "CP":
            totalBreakfasts += hotel.nights;
            break;
          case "MAP":
            totalBreakfasts += hotel.nights;
            totalDinners += hotel.nights;
            break;
          case "AP":
            totalBreakfasts += hotel.nights;
            totalLunches += hotel.nights;
            totalDinners += hotel.nights;
            break;
          default:
            break;
        }
      });
      return { totalBreakfasts, totalLunches, totalDinners };
    };

    // Cost
    summary += `*TOTAL TOUR COST = ₹${quotationData.grandTotal.toFixed()}/-*\n\n`; // Use quotationData.grandTotal

    // INCLUDED - Now based on aggregated meal plans from ALL hotels
    summary += `*INCLUDED*\n`;
    const { totalBreakfasts, totalLunches, totalDinners } =
      calculateTotalMeals();

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
    if (quotationData.transportSummary?.vehicleName) {
      const vehicle = quotationData.transportSummary;
      const acStatus = vehicle.ac ? "AC" : "Non AC"; // assuming ac is a boolean
      summary += `✅ ${
        vehicle.vehicleName || vehicle.type
      } ${acStatus} for all sightseeing and transfer as per itinerary\n`;
      summary += `✅ Toll, Parking, Driver Allowance, Permits\n`;
    }

    // ✅ Activities
    quotationData.activitySummary?.forEach((activity) => {
      // Use ?. for safety
      summary += `✅ ${activity.name.toUpperCase()} (${activity.city}) - ${
        activity.participants
      } Person\n`;
    });

    // ❌ Excluded
    summary += `\n*EXCLUDED*\n`;
    summary += `❌ Train / Flight Fare\n`;
    summary += `❌ Early check in and late check out as per hotel policy\n`;
    summary += `❌ Medical, Emergency, Entry Tickets, activities, expenses\n`;
    summary += `❌ Anything not mentioned in included\n`;

    return summary;
  };

  const displayMessageBox = (message, type) => {
    const messageBox = document.createElement("div");
    messageBox.className = `message-box ${type}`;
    messageBox.textContent = message;
    document.body.appendChild(messageBox);

    // Remove the message box after a few seconds
    setTimeout(() => {
      if (document.body.contains(messageBox)) {
        // Check if it still exists before removing
        document.body.removeChild(messageBox);
      }
    }, 3000); // Display for 3 seconds
  };

  const handleCopyToClipboard = (quotationToCopy) => {
    if (!quotationToCopy) {
      displayMessageBox("No quotation data provided to copy.", "error");
      return;
    }

    const summary = generatePackageSummary(quotationToCopy); // Pass the currently viewed quotation
    let isCopySuccessful = false;

    // Create a temporary textarea element
    const textarea = document.createElement("textarea");
    textarea.value = summary;

    // Make the textarea invisible and append it to the body
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "-9999px";
    document.body.appendChild(textarea);

    try {
      // Select the text in the textarea
      textarea.select();
      // For mobile devices, use setSelectionRange
      textarea.setSelectionRange(0, textarea.value.length);

      // Execute the copy command
      isCopySuccessful = document.execCommand("copy");
      if (!isCopySuccessful) {
        console.error("document.execCommand('copy') failed.");
        // Fallback for cases where execCommand fails (e.g., modern browsers prefer Clipboard API)
        // Note: navigator.clipboard.writeText is less likely to work in some iframes without explicit permissions
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard
            .writeText(summary)
            .then(() => {
              displayMessageBox(
                "Package summary copied to clipboard!",
                "success"
              );
            })
            .catch((err) => {
              displayMessageBox("Failed to copy to clipboard: " + err, "error");
              console.error(
                "Failed to copy using navigator.clipboard.writeText:",
                err
              );
            });
          return; // Exit as async copy is handled
        }
      }
    } catch (err) {
      console.error("Error attempting to copy to clipboard:", err);
      isCopySuccessful = false;
    } finally {
      // Remove the temporary textarea
      document.body.removeChild(textarea);
    }

    // Display message box based on sync copy result
    if (isCopySuccessful) {
      displayMessageBox("Package summary copied to clipboard!", "success");
    } else {
      // If both execCommand and navigator.clipboard failed or weren't used
      displayMessageBox(
        "Failed to copy to clipboard. Your browser might not support this feature directly in this context.",
        "error"
      );
    }
  };

  const handleHotelChange = (indexToUpdate, newHotelId) => {
    const newHotelData = allHotels.find((h) => h.id === newHotelId);
    if (!newHotelData) return;

    setEditingQuotation((prev) => {
      const updatedSummary = [...prev.hotelSummary];
      const oldHotelEntry = updatedSummary[indexToUpdate];

      const newHotelEntry = {
        ...oldHotelEntry,
        hotel: newHotelData.name,
        city: newHotelData.city,
        state: newHotelData.state,
        selectedRoomCategory: newHotelData.rooms[0]?.categoryName || "",
        selectedMealPlan: "EP",
        numDouble: 1,
        numExtraAdult: 0,
        numExtraChild: 0,
      };

      newHotelEntry.hotelTotal = calculateHotelPrice(
        newHotelEntry,
        newHotelData
      );
      updatedSummary[indexToUpdate] = newHotelEntry;

      const updatedQuotation = { ...prev, hotelSummary: updatedSummary };
      updatedQuotation.hotelTotal = updatedSummary.reduce(
        (sum, hotel) => sum + (hotel.hotelTotal || 0),
        0
      );

      return {
        ...updatedQuotation,
        grandTotal: recalculateGrandTotal(updatedQuotation),
      };
    });
  };

  const handlePackageChange = (e) => {
    const newPackageId = e.target.value;
    const newPackage = availableTransportPackagesForSelectedState.find(
      (p) => p.id === newPackageId
    );

    if (
      !newPackage ||
      !newPackage.vehicles ||
      newPackage.vehicles.length === 0
    ) {
      alert("Selected package is invalid or has no vehicles.");
      return;
    }
    console.log("new Package : ", newPackage);

    const newVehicle = newPackage.vehicles[0];

    setEditingQuotation((prev) => {
      const updatedTransportSummary = {
        ...prev.transportSummary,
        id: newPackage.id,
        packageName: newPackage.name || "Unnamed Package",
        pricingType: newPackage.pricingType,
        vehicles: newPackage.vehicles,
        isCustom: false,
        selectedVehicle: newVehicle,
        vehicleName: newVehicle.type,
        price: newVehicle.price ?? 0,
        perKmprice: newVehicle.perKmprice ?? 0,
        ac: newVehicle.ac ?? false,
        totalPrice: newVehicle.price ?? newVehicle.perKmprice ?? 0,
        state: selectedTransportStateId,
        pickupLocation: prev.transportSummary.pickupLocation ?? null,
        dropLocation: prev.transportSummary.dropLocation ?? null,
        days: prev.transportSummary.days ?? null,
        kms: prev.transportSummary.kms ?? null,
      };

      const updatedQuotation = {
        ...prev,
        transportSummary: updatedTransportSummary,
      };

      const newGrandTotal = recalculateGrandTotal(updatedQuotation);

      return {
        ...updatedQuotation,
        grandTotal: newGrandTotal,
      };
    });
  };

  const handleVehicleChange = (newVehicle) => {
    setEditingQuotation((prev) => {
      const updatedTransportSummary = {
        ...prev.transportSummary,
        selectedVehicle: newVehicle,
        vehicleName: newVehicle.type,
        price: newVehicle.price ?? 0,
        perKmprice: newVehicle.perKmprice ?? 0,
        ac: newVehicle.ac ?? false,
        totalPrice: newVehicle.price ?? newVehicle.perKmprice ?? 0,
        state: prev.transportSummary.state ?? null,
        pickupLocation: prev.transportSummary.pickupLocation ?? null,
        dropLocation: prev.transportSummary.dropLocation ?? null,
        days: prev.transportSummary.days ?? null,
        kms: prev.transportSummary.kms ?? null,
      };

      const updatedQuotation = {
        ...prev,
        transportSummary: updatedTransportSummary,
      };

      const newGrandTotal = recalculateGrandTotal(updatedQuotation);

      return {
        ...updatedQuotation,
        grandTotal: newGrandTotal,
      };
    });
  };

  const handleActivitySummaryChange = (index, name, value) => {
    setEditingQuotation((prev) => {
      const updatedActivitySummary = [...prev.activitySummary];
      const activityToUpdate = { ...updatedActivitySummary[index] };

      if (name === "participants") {
        const participants = parseInt(value, 10) || 0;
        activityToUpdate.participants = participants;
        let rate = 0;
        if (participants > 10) {
          rate = activityToUpdate.groupRatePerPerson;
        } else {
          rate = activityToUpdate.fitRatePerPerson;
        }
        activityToUpdate.totalPrice = rate * participants;
        updatedActivitySummary[index] = activityToUpdate;
      }

      const updatedQuotation = {
        ...prev,
        activitySummary: updatedActivitySummary,
      };

      updatedQuotation.activityTotal = updatedActivitySummary.reduce(
        (sum, act) => sum + (act.totalPrice || 0),
        0
      );
      const newGrandTotal = recalculateGrandTotal(updatedQuotation);

      return {
        ...updatedQuotation,
        grandTotal: newGrandTotal,
      };
    });
  };

  const handleAddActivity = () => {
    if (!selectedActivityToAdd) {
      alert("Please select an activity to add.");
      return;
    }
    let isAlreadyAdded = false;
    try {
      isAlreadyAdded = editingQuotation.activitySummary.some(
        (activity) => activity.name === selectedActivityToAdd
      );
    } catch (error) {
      isAlreadyAdded = false;
    }

    if (isAlreadyAdded) {
      alert("This activity is already in the quotation.");
      return;
    }

    const activityData = availableActivities.find(
      (act) => act.name === selectedActivityToAdd
    );
    if (!activityData) return;

    const newActivity = {
      name: activityData.name,
      city: activityData.city,
      state: activityData.state,
      fitRatePerPerson: activityData.fitRatePerPerson || 0,
      groupRatePerPerson: activityData.groupRatePerPerson || 0,
      participants: 1,
      totalPrice: parseFloat(
        activityData.fitRatePerPerson || activityData.groupRatePerPerson || 0
      ),
    };

    setEditingQuotation((prev) => {
      const updatedActivitySummary = [
        ...(prev.activitySummary || []),
        newActivity,
      ];
      const updatedQuotation = {
        ...prev,
        activitySummary: updatedActivitySummary,
      };
      const newGrandTotal = recalculateGrandTotal(updatedQuotation);
      return {
        ...updatedQuotation,
        grandTotal: newGrandTotal,
      };
    });

    setSelectedActivityToAdd("");
  };

  const handleRemoveActivity = (indexToRemove) => {
    setEditingQuotation((prev) => {
      const updatedActivitySummary = prev.activitySummary.filter(
        (_, index) => index !== indexToRemove
      );
      const updatedQuotation = {
        ...prev,
        activitySummary: updatedActivitySummary,
      };
      const newGrandTotal = recalculateGrandTotal(updatedQuotation);
      return {
        ...updatedQuotation,
        grandTotal: newGrandTotal,
      };
    });
  };

  const [showSaveAsModal, setShowSaveAsModal] = useState(false);
  const [newPackageName, setNewPackageName] = useState("");
  const [newCustomerName, setNewCustomerName] = useState("");

  const handleSaveAs = async () => {
    if (!editingQuotation) {
      alert("Cannot perform 'Save As' without an active quotation.");
      return;
    }

    setNewPackageName(`Copy of ${editingQuotation.packageName}`);
    setNewCustomerName(`Copy of ${editingQuotation.customerName}`);
    setShowSaveAsModal(true);
    setIsEditModalOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleConfirmSaveAs = async () => {
    if (!newPackageName.trim()) {
      alert("Quotation name is required.");
      return;
    }
    if (!newCustomerName.trim()) {
      alert("Customer name is required.");
      return;
    }

    const agentId = user?.uid;
    if (!agentId) {
      alert("You must be logged in to save a new quotation.");
      return;
    }

    const newQuotationData = { ...editingQuotation };

    delete newQuotationData.id;
    newQuotationData.packageName = newPackageName.trim();
    newQuotationData.customerName = newCustomerName.trim();
    newQuotationData.createdAt = new Date();

    try {
      const packagesRef = collection(
        db,
        "saved_packages_by_agents",
        agentId,
        "packages"
      );
      await addDoc(packagesRef, newQuotationData);

      alert("New quotation is saved successfully! ✅");
      setIsEditModalOpen(false);
      setShowSaveAsModal(false); // Hide the new modal
      fetchQuotations();
    } catch (error) {
      console.error("Error saving new quotation:", error);
      alert(
        "Failed to save the new quotation. Please check the console for details."
      );
    }
  };

  const handleSaveChanges = async () => {
    const agentId = user?.uid;
    if (!agentId || !editingQuotation) return;

    try {
      const quotationRef = doc(
        db,
        "saved_packages_by_agents",
        agentId,
        "packages",
        editingQuotation.id
      );

      await updateDoc(quotationRef, {
        customerName: editingQuotation.customerName || "",
        status: editingQuotation.status || "Draft",
        hotelSummary: editingQuotation.hotelSummary || [],
        transportSummary: editingQuotation.transportSummary || {},
        activitySummary: editingQuotation.activitySummary || [],
        grandTotal: editingQuotation.grandTotal || 0,
        markup: editingQuotation.markup || 0,
      });

      alert("Quotation updated successfully!");
      setIsEditModalOpen(false);
      setEditingQuotation(null);
      fetchQuotations();
    } catch (error) {
      alert("Failed to update quotation.");
      console.error("Error updating quotation:", error);
    }
  };

  const handleDeleteQuotation = async (quotationId) => {
    const agentId = user?.uid;
    if (!agentId) {
      alert("You are not authenticated.");
      return;
    }

    if (window.confirm("Are you sure you want to delete this quotation?")) {
      try {
        await deleteDoc(
          doc(db, "saved_packages_by_agents", agentId, "packages", quotationId)
        );
        alert("Quotation deleted successfully!");
        fetchQuotations();
      } catch (error) {
        alert("Failed to delete quotation.");
        console.error("Error deleting quotation:", error);
      }
    }
  };

  if (loading) return <p>Loading quotations...</p>;
  if (quotations.length === 0) return <p>No quotations found.</p>;

  // --- 6. JSX ---
  return (
    <div className="my-quotations-container">
      {/* --- Search and Filter Section --- */}
      <div className="filter-container">
        <input
          type="text"
          placeholder="Search by Customer or Package..."
          className="search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className="filter-controls">
          <select
            value={filterDestination}
            onChange={(e) => setFilterDestination(e.target.value)}
          >
            <option value="">All Destinations</option>
            {[...new Set(quotations.map((q) => getDestinationOfpkg(q)))].map(
              (dest) => (
                <option key={dest} value={dest}>
                  {dest}
                </option>
              )
            )}
          </select>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <button
            onClick={() => {
              setSearchTerm("");
              setFilterDestination("");
              setStartDate("");
              setEndDate("");
            }}
          >
            Clear
          </button>
        </div>
      </div>
      <table className="quotations-table">
        <thead>
          <tr>
            <th>Quote No.</th>
            <th>Customer Name</th>
            <th>Package Name</th>
            <th>Destination</th>
            <th>Created Date</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredQuotations.map((q, index) => (
            <tr
              key={q.id}
              className="quotation-row-clickable"
              onClick={() => handleViewClick(q)}
            >
              <td>{`Quote ${q.quoteNumber}`}</td>
              <td>{q.customerName || "N/A"}</td>
              <td>{q.packageName || "N/A"}</td>
              <td style={{ whiteSpace: "pre-wrap" }}>
                {getDestinationOfpkg(q)}
              </td>
              <td>
                {q.createdAt
                  ? new Date(q.createdAt.seconds * 1000).toLocaleDateString(
                      "en-GB"
                    )
                  : "N/A"}
              </td>
              <td>{q.status || "Draft"}</td>
              <td
                className="action-buttons"
                onClick={(e) => e.stopPropagation()}
              >
                <button onClick={() => handleEditClick(q)}>Edit</button>
                <button
                  onClick={() => handleDownloadPDF(q)}
                  className="download-pdf-button"
                >
                  Download PDF
                </button>
                <button
                  onClick={() => handleDeleteQuotation(q.id)}
                  className="delete-button"
                >
                  Delete
                </button>
                <button
                  onClick={() => handleCopyToClipboard(q)} // Now calls generatePackageSummary with viewingQuotation
                  className="copy-button"
                >
                  Copy Summary to Clipboard
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {isEditModalOpen && editingQuotation && (
        <div
          className="modal-overlay"
          onClick={() => setIsEditModalOpen(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Edit Quotation</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveChanges();
              }}
            >
              <div className="form-group">
                <label htmlFor="customerName">Customer Name:</label>
                <input
                  type="text"
                  id="customerName"
                  name="customerName"
                  value={editingQuotation.customerName || ""}
                  onChange={handleEditChange}
                />
              </div>
              <hr />
              <h3>Hotel Details</h3>
              {Array.isArray(editingQuotation.hotelSummary) &&
              editingQuotation.hotelSummary.length > 0 ? (
                <table className="details-table">
                  <thead>
                    <tr>
                      <th>Hotel</th>
                      <th>Room Category</th>
                      <th>Nights</th>
                      <th>Rooms</th>
                      <th>Adults</th>
                      <th>Children</th>
                      <th>Meal Plan</th>
                      <th>Price</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editingQuotation.hotelSummary.map((hotel, index) => {
                      const availableHotelsInState = allHotels.filter(
                        (h) => h.state === hotel.state
                      );
                      const currentHotelData = allHotels.find(
                        (h) => h.name === hotel.hotel && h.state === hotel.state
                      );
                      const currentHotelId = currentHotelData
                        ? currentHotelData.id
                        : "";

                      return (
                        <tr key={index}>
                          <td>
                            <select
                              value={currentHotelId}
                              onChange={(e) =>
                                handleHotelChange(index, e.target.value)
                              }
                              className="table-select"
                            >
                              {availableHotelsInState.map((h) => (
                                <option key={h.id} value={h.id}>
                                  {h.name} ({h.city})
                                </option>
                              ))}
                            </select>
                          </td>

                          <td>
                            <select
                              value={hotel.selectedRoomCategory || ""}
                              onChange={(e) =>
                                handleHotelSummaryChange(
                                  index,
                                  "selectedRoomCategory",
                                  e.target.value
                                )
                              }
                              className="table-select"
                            >
                              {currentHotelData?.rooms?.map((room) => (
                                <option
                                  key={room.categoryName}
                                  value={room.categoryName}
                                >
                                  {room.categoryName}
                                </option>
                              ))}
                            </select>
                          </td>

                          <td>
                            <input
                              type="number"
                              min="1"
                              value={hotel.nights || 1}
                              onChange={(e) =>
                                handleHotelSummaryChange(
                                  index,
                                  "nights",
                                  parseInt(e.target.value, 10)
                                )
                              }
                              className="table-input-number"
                            />
                          </td>

                          <td>
                            <input
                              type="number"
                              min="0"
                              value={hotel.numDouble || 0}
                              onChange={(e) =>
                                handleHotelSummaryChange(
                                  index,
                                  "numDouble",
                                  parseInt(e.target.value, 10)
                                )
                              }
                              className="table-input-number"
                            />
                          </td>

                          <td>
                            <input
                              type="number"
                              min="0"
                              value={hotel.numExtraAdult || 0}
                              onChange={(e) =>
                                handleHotelSummaryChange(
                                  index,
                                  "numExtraAdult",
                                  parseInt(e.target.value, 10)
                                )
                              }
                              className="table-input-number"
                            />
                          </td>

                          <td>
                            <input
                              type="number"
                              min="0"
                              value={hotel.numExtraChild || 0}
                              onChange={(e) =>
                                handleHotelSummaryChange(
                                  index,
                                  "numExtraChild",
                                  parseInt(e.target.value, 10)
                                )
                              }
                              className="table-input-number"
                            />
                          </td>

                          <td>
                            <select
                              value={hotel.selectedMealPlan || "EP"}
                              onChange={(e) =>
                                handleHotelSummaryChange(
                                  index,
                                  "selectedMealPlan",
                                  e.target.value
                                )
                              }
                              className="table-select"
                            >
                              {getAvailableMealPlans(hotel).map((plan) => (
                                <option key={plan} value={plan}>
                                  {plan}
                                </option>
                              ))}
                            </select>
                          </td>

                          <td className="price-cell">
                            ₹{hotel.hotelTotal?.toFixed(2) || "0.00"}
                          </td>

                          <td>
                            <button
                              type="button"
                              onClick={() => handleRemoveHotel(index)}
                              className="remove-btn-table"
                            >
                              <DeleteIcon fontSize="small" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <p>No hotel details to edit.</p>
              )}
              <hr />
              <div className="form-group">
                <label htmlFor="selectStateForAdding">
                  Select State for Adding Hotels:
                </label>
                <select
                  id="selectStateForAdding"
                  value={SelectedDestination}
                  onChange={(e) => setSelectedDestination(e.target.value)}
                  className="select-state-filter"
                >
                  <option value="">Select a State</option>
                  {AllDestinations.map((state) => (
                    <option key={state.name} value={state.name}>
                      {state.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="add-activity-section">
                <h4>Add a New Hotel</h4>
                <div className="form-group-inline">
                  <select
                    value={selectedHotelToAdd}
                    onChange={(e) => setSelectedHotelToAdd(e.target.value)}
                  >
                    <option value="" disabled>
                      Select a hotel to add...
                    </option>
                    {allHotels
                      .filter((h) => h.state === SelectedDestination)
                      .map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name} ({h.city})
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddHotel}
                    className="add-btn"
                    disabled={!selectedHotelToAdd}
                  >
                    Add Hotel
                  </button>
                </div>
              </div>
              <hr />
              <h3>Transportation Details</h3>
              Custom Transport{" "}
              <label className="switch">
                <input
                  type="checkbox"
                  checked={toggleValue}
                  onChange={handleToggle}
                />
                <span className="slider round"></span>
              </label>{" "}
              Package Service
              {editingQuotation.transportSummary ? (
                <div className="transport-edit-entry">
                  {!toggleValue ? (
                    <>
                      <div className="form-group">
                        <label htmlFor="transportVehicle">Vehicle Name:</label>
                        <input
                          type="text"
                          id="transportVehicle"
                          value={
                            editingQuotation.transportSummary.vehicleName || ""
                          }
                          onChange={(e) =>
                            handleTransportSummaryChange(
                              "vehicleName",
                              e.target.value
                            )
                          }
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="transportPrice">Price (₹):</label>
                        <input
                          type="number"
                          min="0"
                          id="transportPrice"
                          value={editingQuotation.transportSummary.price || 0}
                          onChange={(e) =>
                            handleTransportSummaryChange(
                              "price",
                              parseFloat(e.target.value) || 0
                            )
                          }
                        />
                      </div>
                      <div className="form-group">
                        <label>
                          <input
                            type="checkbox"
                            checked={!!editingQuotation.transportSummary.ac}
                            onChange={(e) =>
                              handleTransportSummaryChange(
                                "ac",
                                e.target.checked
                              )
                            }
                          />{" "}
                          AC
                        </label>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="form-group">
                        <label htmlFor="selectTransportState">
                          Select Transport State:
                        </label>
                        <select
                          id="selectTransportState"
                          value={selectedTransportStateId}
                          onChange={(e) =>
                            setSelectedTransportStateId(e.target.value)
                          }
                          className="select-state-filter"
                        >
                          <option value="">Select a State</option>
                          {transportStates.map((state) => (
                            <option key={state.id} value={state.id}>
                              {toTitleCase(state.id)}
                            </option>
                          ))}
                        </select>
                      </div>

                      {selectedTransportStateId && (
                        <>
                          <p>
                            <strong>Current Package:</strong>{" "}
                            {editingQuotation.transportSummary.packageName ||
                              "N/A"}
                          </p>

                          <div className="form-group">
                            <label htmlFor="packageSelect">
                              Change Package:
                            </label>
                            <select
                              id="packageSelect"
                              value={editingQuotation.transportSummary.id || ""}
                              onChange={handlePackageChange}
                            >
                              <option value="" disabled>
                                Select a package
                              </option>
                              {availableTransportPackagesForSelectedState.map(
                                (pkg) => (
                                  <option key={pkg.id} value={pkg.id}>
                                    {pkg.packageName || pkg.name || pkg.id}
                                  </option>
                                )
                              )}
                            </select>
                          </div>
                          {editingQuotation.transportSummary.vehicles &&
                            editingQuotation.transportSummary.vehicles.length >
                              0 && (
                              <div className="form-group">
                                <label htmlFor="vehicleSelect">
                                  Select Vehicle:
                                </label>
                                <select
                                  id="vehicleSelect"
                                  value={
                                    editingQuotation.transportSummary
                                      .selectedVehicle?.type || ""
                                  }
                                  onChange={(e) => {
                                    const selectedVehicleType = e.target.value;
                                    const selectedVehicle =
                                      editingQuotation.transportSummary.vehicles.find(
                                        (v) => v.type === selectedVehicleType
                                      );
                                    if (selectedVehicle) {
                                      handleVehicleChange(selectedVehicle);
                                    }
                                  }}
                                >
                                  <option value="" disabled>
                                    Select a vehicle
                                  </option>
                                  {editingQuotation.transportSummary.vehicles.map(
                                    (vehicle, index) => (
                                      <option key={index} value={vehicle.type}>
                                        {vehicle.type} - ₹
                                        {vehicle.price ?? vehicle.perKmprice}{" "}
                                        {vehicle.ac ? "(AC)" : "(Non-AC)"}
                                      </option>
                                    )
                                  )}
                                </select>
                              </div>
                            )}
                          <div className="form-group">
                            <label>AC Status:</label>
                            <p>
                              {editingQuotation.transportSummary.ac
                                ? "Available "
                                : "Not Available"}
                            </p>
                          </div>
                          <div className="form-group">
                            <label>Vehicle Cost (Current):</label>
                            <p>
                              ₹{editingQuotation.transportSummary.totalPrice}
                            </p>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <p>No transport details to edit.</p>
              )}
              <hr />
              <h3>Activity Details</h3>
              <div className="form-group">
                <label htmlFor="selectStateForAdding">
                  Select State for Adding Hotels:
                </label>
                <select
                  id="selectStateForAdding"
                  value={SelectedDestination}
                  onChange={(e) => setSelectedDestination(e.target.value)}
                  className="select-state-filter"
                >
                  <option value="">Select a State</option>
                  {AllDestinations.map((state) => (
                    <option key={state.name} value={state.name}>
                      {state.name}
                    </option>
                  ))}
                </select>
              </div>
              {Array.isArray(editingQuotation.activitySummary) &&
              editingQuotation.activitySummary.length > 0 ? (
                <table className="details-table">
                  <thead>
                    <tr>
                      <th>Activity Name</th>
                      <th>Participants</th>
                      <th>Total Price</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editingQuotation.activitySummary.map((activity, index) => (
                      <tr key={activity.id || index}>
                        <td>
                          {activity.name} ({activity.city})
                        </td>
                        <td>
                          <input
                            type="number"
                            min="1"
                            value={activity.participants || 1}
                            onChange={(e) =>
                              handleActivitySummaryChange(
                                index,
                                "participants",
                                e.target.value
                              )
                            }
                            className="table-input-number"
                          />
                        </td>
                        <td className="price-cell">
                          ₹{activity.totalPrice?.toFixed(2) || "0.00"}
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => handleRemoveActivity(index)}
                            className="remove-btn-table"
                          >
                            <DeleteIcon fontSize="small" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>No activities added to this quotation yet.</p>
              )}
              <div className="add-activity-section">
                <hr />
                <h4>Add a New Activity</h4>
                {isFetchingActivities ? (
                  <p>Loading available activities...</p>
                ) : (
                  <div className="form-group-inline">
                    <select
                      value={selectedActivityToAdd}
                      onChange={(e) => setSelectedActivityToAdd(e.target.value)}
                    >
                      <option value="" disabled>
                        Select an activity...
                      </option>
                      {availableActivities.map((act) => (
                        <option key={act.name} value={act.name}>
                          {act.name} ({act.city}) - ₹
                          {act.fitRatePerPerson || act.groupRatePerPerson}
                          /person
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleAddActivity}
                      className="add-btn"
                      disabled={!selectedActivityToAdd}
                    >
                      Add Activity
                    </button>
                  </div>
                )}
              </div>
              <hr />
              <div className="totals-section">
                <h3>Pricing</h3>
                <div className="form-group">
                  <label htmlFor="markup">Add Markup (₹)</label>
                  <input
                    id="markup"
                    type="number"
                    placeholder="e.g., 5000"
                    value={editingQuotation.markup}
                    onChange={(e) => handleMarkupInputChange(e.target.value)}
                    className="markup-input"
                  />
                </div>
              </div>
              <p>
                <strong>Grand Total:</strong> ₹
                {editingQuotation.grandTotal?.toFixed(2) || 0}
              </p>
              <div className="form-group">
                <label htmlFor="status">Status:</label>
                <select
                  id="status"
                  name="status"
                  value={editingQuotation.status || "Draft"}
                  onChange={handleEditChange}
                >
                  <option value="Draft">Draft</option>
                  <option value="Sent">Sent</option>
                  <option value="Accepted">Accepted</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="submit" className="save-btn">
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={handleSaveAs}
                  className="save-as-btn"
                >
                  Save As New
                </button>
                <button
                  type="button"
                  className="close-btn"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showSaveAsModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowSaveAsModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Save Quotation As New</h3>
            <div className="form-group">
              <label htmlFor="newPackageName">New Package Name:</label>
              <input
                type="text"
                id="newPackageName"
                value={newPackageName}
                onChange={(e) => setNewPackageName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="newCustomerName">New Customer Name:</label>
              <input
                type="text"
                id="newCustomerName"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
              />
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="close-new"
                onClick={() => setShowSaveAsModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="save-new"
                onClick={handleConfirmSaveAs}
              >
                Save As New
              </button>
            </div>
          </div>
        </div>
      )}
      {/* --- NEW View Details Modal --- */}
      {isViewModalOpen && viewingQuotation && (
        <div
          className="modal-overlay"
          onClick={() => setIsViewModalOpen(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Quotation for {viewingQuotation.customerName}</h3>

            {/* Hotel Details */}
            <div className="view-modal-section">
              <h4>Hotel Details</h4>
              {viewingQuotation.hotelSummary?.map((hotel, index) => (
                <div key={index} className="detail-item">
                  <span>
                    {hotel.hotel} ({hotel.nights}N) {hotel.selectedRoomCategory}{" "}
                    [{hotel.numDouble}D,{hotel.numExtraAdult}A,
                    {hotel.numExtraChild}C]
                  </span>
                  <span>{hotel.selectedMealPlan}</span>
                </div>
              ))}
            </div>

            {/* Transport Details */}
            <div className="view-modal-section">
              <h4>Transport Details</h4>
              <div className="detail-item">
                <span>Vehicle</span>
                <span>
                  {viewingQuotation.transportSummary?.vehicleName || "N/A"}
                  {viewingQuotation.transportSummary?.ac ? "(AC)" : "(Non-AC)"}
                </span>
              </div>
            </div>

            {/* Activity Details */}
            <div className="view-modal-section">
              <h4>Activity Details</h4>
              {viewingQuotation.activitySummary?.map((activity, index) => (
                <div key={index} className="detail-item">
                  <span>{activity.name}</span>
                  <span>{activity.participants} Person(s)</span>
                </div>
              ))}
            </div>

            {/* Cost Summary */}
            <div className="view-modal-section">
              <h4>Cost Summary</h4>
              <div className="cost-summary">
                <div className="cost-item">
                  <span>Hotel Total:</span>
                  <span>
                    ₹
                    {viewingQuotation.hotelSummary
                      ?.reduce((sum, hotel) => sum + (hotel.hotelTotal || 0), 0)
                      ?.toFixed(2) || "0.00"}
                  </span>
                </div>
                <div className="cost-item">
                  <span>Transport Total:</span>
                  {viewingQuotation.transportSummary?.pricingType ===
                  "perKm" ? (
                    <span>
                      ₹
                      {(
                        viewingQuotation.transportSummary?.perKmprice *
                        viewingQuotation.transportSummary?.kms
                      )?.toFixed(2) || "0.00"}
                    </span>
                  ) : (
                    <span>
                      ₹
                      {viewingQuotation.transportSummary?.price?.toFixed(2) ||
                        "0.00"}
                    </span>
                  )}
                </div>
                <div className="cost-item">
                  <span>Activity Total:</span>
                  <span>
                    ₹
                    {viewingQuotation.activitySummary
                      ?.reduce((sum, act) => sum + act.totalPrice, 0)
                      ?.toFixed(2) || "0.00"}
                  </span>
                </div>
                <div className="cost-item">
                  <span>Markup:</span>
                  <span>{viewingQuotation.markup || "N/A"}</span>
                </div>
                <div className="cost-item grand-total">
                  <span>Grand Total:</span>
                  <span>
                    ₹{viewingQuotation.grandTotal?.toFixed(2) || "0.00"}
                  </span>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="close-btn"
                onClick={() => setIsViewModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Social Media Links Footer --- */}
      <div className="social-links-footer">
        <div className="social-links-container">
          <span className="social-links-text">For Reviews:</span>
          <a
            href="https://share.google/gpnOuOQxhD49T77Yw"
            target="_blank"
            rel="noopener noreferrer"
            className="social-link google-link"
          >
            <FontAwesomeIcon
              icon={faGoogle}
              className="social-icon"
              size="lg"
            />
            <span>Google</span>
          </a>
          <span className="social-links-text">| Follow Us: </span>
          <a
            href="https://www.instagram.com/adwaittours?igsh=MW11cGRldWR4aGJxdQ=="
            target="_blank"
            rel="noopener noreferrer"
            className="social-link instagram-link"
          >
            <FontAwesomeIcon
              icon={faInstagram}
              className="social-icon"
              size="lg"
            />
            <span>Instagram</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default MyQuotations;