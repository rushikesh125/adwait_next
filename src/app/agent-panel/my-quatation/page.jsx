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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Search,
  Download,
  Edit,
  Trash2,
  Copy,
  Plus,
  FileText,
  Calendar,
  MapPin,
  Users,
  IndianRupee,
  Hotel,
  Car,
  ActivitySquare,
  X,
} from "lucide-react";
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
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-theme-primary">My Quotations</h1>
          <p className="text-muted-foreground mt-1">
            Manage and edit your travel quotations
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-8 border-theme-muted shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by customer or package name..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 space-y-2">
              <Label htmlFor="destination">Destination</Label>
              <Select value={filterDestination} onValueChange={setFilterDestination}>
                <SelectTrigger>
                  <SelectValue placeholder="All Destinations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Destinations">All Destinations</SelectItem>
                  {[...new Set(quotations.map(q => getDestinationOfpkg(q)))].map(dest => (
                    <SelectItem key={dest} value={dest}>
                      {dest}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4 flex-1">
              <div className="space-y-2">
                <Label htmlFor="startDate">From Date</Label>
                <Input
                  type="date"
                  id="startDate"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">To Date</Label>
                <Input
                  type="date"
                  id="endDate"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm("");
                setFilterDestination("");
                setStartDate("");
                setEndDate("");
              }}
              className="h-10"
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quotations Table */}
      <Card className="border-theme-muted shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl text-theme-primary">All Quotations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-theme-muted/30 hover:bg-theme-muted/50">
                  <TableHead className="w-24">Quote No.</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Package</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuotations.map((q) => (
                  <TableRow
                    key={q.id}
                    className="cursor-pointer hover:bg-theme-muted/20 transition-colors"
                    onClick={() => handleViewClick(q)}
                  >
                    <TableCell className="font-medium">Quote {q.quoteNumber}</TableCell>
                    <TableCell>{q.customerName || "—"}</TableCell>
                    <TableCell>{q.packageName || "—"}</TableCell>
                    <TableCell className="whitespace-pre-line max-w-xs">
                      {getDestinationOfpkg(q)}
                    </TableCell>
                    <TableCell>
                      {q.createdAt
                        ? new Date(q.createdAt.seconds * 1000).toLocaleDateString("en-GB")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          q.status === "Accepted" ? "success" :
                          q.status === "Sent" ? "default" :
                          q.status === "Rejected" ? "destructive" : "secondary"
                        }
                      >
                        {q.status || "Draft"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditClick(q)}
                        title="Edit Quotation"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownloadPDF(q)}
                        title="Download PDF"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive/90"
                            title="Delete Quotation"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the quotation for "{q.customerName}".
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteQuotation(q.id)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCopyToClipboard(q)}
                        title="Copy Summary"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ================== EDIT MODAL ================== */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="min-w-6xl max-h-[90vh] overflow-scroll flex flex-col">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="text-2xl text-theme-primary">
              Edit Quotation
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4 -mr-4">
            <div className="space-y-8 py-6">
              {/* Customer Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="customerName">Customer Name</Label>
                  <Input
                    id="customerName"
                    name="customerName"
                    value={editingQuotation?.customerName || ""}
                    onChange={handleEditChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    name="status"
                    value={editingQuotation?.status || "Draft"}
                    onValueChange={(value) =>
                      handleEditChange({ target: { name: "status", value } })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Draft">Draft</SelectItem>
                      <SelectItem value="Sent">Sent</SelectItem>
                      <SelectItem value="Accepted">Accepted</SelectItem>
                      <SelectItem value="Rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Tabs defaultValue="hotels" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="hotels" className="gap-2">
                    <Hotel className="h-4 w-4" />
                    Hotels
                  </TabsTrigger>
                  <TabsTrigger value="transport" className="gap-2">
                    <Car className="h-4 w-4" />
                    Transport
                  </TabsTrigger>
                  <TabsTrigger value="activities" className="gap-2">
                    <ActivitySquare className="h-4 w-4" />
                    Activities
                  </TabsTrigger>
                </TabsList>

                {/* HOTELS TAB */}
                <TabsContent value="hotels" className="space-y-6">
                  {/* Add Hotel */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Add New Hotel</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Select State</Label>
                          <Select
                            value={SelectedDestination}
                            onValueChange={setSelectedDestination}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select state" />
                            </SelectTrigger>
                            <SelectContent>
                              {AllDestinations.map((state) => (
                                <SelectItem key={state.name} value={state.name}>
                                  {state.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Select Hotel</Label>
                          <div className="flex gap-3">
                            <Select
                              value={selectedHotelToAdd}
                              onValueChange={setSelectedHotelToAdd}
                              disabled={!SelectedDestination}
                            >
                              <SelectTrigger className="flex-1">
                                <SelectValue placeholder="Choose hotel..." />
                              </SelectTrigger>
                              <SelectContent>
                                {allHotels
                                  .filter((h) => h.state === SelectedDestination)
                                  .map((h) => (
                                    <SelectItem key={h.id} value={h.id}>
                                      {h.name} ({h.city})
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                            <Button
                              onClick={handleAddHotel}
                              disabled={!selectedHotelToAdd}
                              className="bg-theme-primary hover:bg-theme-secondary"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Hotels Table */}
                  {editingQuotation?.hotelSummary?.length > 0 ? (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead>Hotel</TableHead>
                            <TableHead>Room Type</TableHead>
                            <TableHead>Nights</TableHead>
                            <TableHead>Rooms</TableHead>
                            <TableHead>Adults</TableHead>
                            <TableHead>Children</TableHead>
                            <TableHead>Meal Plan</TableHead>
                            <TableHead className="text-right">Price</TableHead>
                            <TableHead className="w-16"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {editingQuotation.hotelSummary.map((hotel, index) => {
                            const currentHotelData = allHotels.find(
                              (h) => h.name === hotel.hotel && h.state === hotel.state
                            );
                            return (
                              <TableRow key={index}>
                                <TableCell className="font-medium">
                                  <Select
                                    value={
                                      allHotels.find(
                                        (h) =>
                                          h.name === hotel.hotel &&
                                          h.state === hotel.state
                                      )?.id || ""
                                    }
                                    onValueChange={(val) => handleHotelChange(index, val)}
                                  >
                                    <SelectTrigger className="w-[220px]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {allHotels
                                        .filter((h) => h.state === hotel.state)
                                        .map((h) => (
                                          <SelectItem key={h.id} value={h.id}>
                                            {h.name} ({h.city})
                                          </SelectItem>
                                        ))}
                                    </SelectContent>
                                  </Select>
                                </TableCell>

                                <TableCell>
                                  <Select
                                    value={hotel.selectedRoomCategory || ""}
                                    onValueChange={(val) =>
                                      handleHotelSummaryChange(index, "selectedRoomCategory", val)
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {currentHotelData?.rooms?.map((room) => (
                                        <SelectItem key={room.categoryName} value={room.categoryName}>
                                          {room.categoryName}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </TableCell>

                                <TableCell>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={hotel.nights || 1}
                                    onChange={(e) =>
                                      handleHotelSummaryChange(index, "nights", e.target.value)
                                    }
                                    className="w-20"
                                  />
                                </TableCell>

                                <TableCell>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={hotel.numDouble || 0}
                                    onChange={(e) =>
                                      handleHotelSummaryChange(index, "numDouble", e.target.value)
                                    }
                                    className="w-20"
                                  />
                                </TableCell>

                                <TableCell>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={hotel.numExtraAdult || 0}
                                    onChange={(e) =>
                                      handleHotelSummaryChange(index, "numExtraAdult", e.target.value)
                                    }
                                    className="w-20"
                                  />
                                </TableCell>

                                <TableCell>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={hotel.numExtraChild || 0}
                                    onChange={(e) =>
                                      handleHotelSummaryChange(index, "numExtraChild", e.target.value)
                                    }
                                    className="w-20"
                                  />
                                </TableCell>

                                <TableCell>
                                  <Select
                                    value={hotel.selectedMealPlan || "EP"}
                                    onValueChange={(val) =>
                                      handleHotelSummaryChange(index, "selectedMealPlan", val)
                                    }
                                  >
                                    <SelectTrigger className="w-32">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {getAvailableMealPlans(hotel).map((plan) => (
                                        <SelectItem key={plan} value={plan}>
                                          {plan}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </TableCell>

                                <TableCell className="text-right font-medium">
                                  ₹{(hotel.hotelTotal || 0).toFixed(0)}
                                </TableCell>

                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemoveHotel(index)}
                                    disabled={editingQuotation.hotelSummary.length <= 1}
                                    className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      No hotels added yet. Add your first hotel above.
                    </div>
                  )}
                </TabsContent>

                {/* TRANSPORT TAB */}
                <TabsContent value="transport" className="space-y-6">
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Transportation</CardTitle>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium">Custom</span>
                          <Switch
                            checked={toggleValue}
                            onCheckedChange={handleToggle}
                          />
                          <span className="text-sm font-medium">Package</span>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-6">
                      {!toggleValue ? (
                        // Custom Transport
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="space-y-2">
                            <Label>Vehicle Name</Label>
                            <Input
                              value={editingQuotation?.transportSummary?.vehicleName || ""}
                              onChange={(e) =>
                                handleTransportSummaryChange("vehicleName", e.target.value)
                              }
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Price (₹)</Label>
                            <Input
                              type="number"
                              min="0"
                              value={editingQuotation?.transportSummary?.price || 0}
                              onChange={(e) =>
                                handleTransportSummaryChange("price", parseFloat(e.target.value) || 0)
                              }
                            />
                          </div>

                          <div className="flex items-end">
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id="ac"
                                checked={!!editingQuotation?.transportSummary?.ac}
                                onChange={(e) =>
                                  handleTransportSummaryChange("ac", e.target.checked)
                                }
                                className="h-4 w-4 rounded border-gray-300 text-theme-primary focus:ring-theme-primary"
                              />
                              <Label htmlFor="ac" className="text-sm font-medium">
                                AC Vehicle
                              </Label>
                            </div>
                          </div>
                        </div>
                      ) : (
                        // Package Transport
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <Label>Select State</Label>
                              <Select
                                value={selectedTransportStateId}
                                onValueChange={setSelectedTransportStateId}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select transport state" />
                                </SelectTrigger>
                                <SelectContent>
                                  {transportStates.map((state) => (
                                    <SelectItem key={state.id} value={state.id}>
                                      {toTitleCase(state.id)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {selectedTransportStateId && (
                              <div className="space-y-2">
                                <Label>Change Package</Label>
                                <Select
                                  value={editingQuotation?.transportSummary?.id || ""}
                                  onValueChange={(val) => {
                                    const e = { target: { value: val } };
                                    handlePackageChange(e);
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select package" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {availableTransportPackagesForSelectedState.map((pkg) => (
                                      <SelectItem key={pkg.id} value={pkg.id}>
                                        {pkg.name || pkg.packageName || pkg.id}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </div>

                          {editingQuotation?.transportSummary?.vehicles?.length > 0 && (
                            <div className="space-y-2">
                              <Label>Select Vehicle</Label>
                              <Select
                                value={editingQuotation?.transportSummary?.selectedVehicle?.type || ""}
                                onValueChange={(val) => {
                                  const vehicle = editingQuotation.transportSummary.vehicles.find(
                                    (v) => v.type === val
                                  );
                                  if (vehicle) handleVehicleChange(vehicle);
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select vehicle" />
                                </SelectTrigger>
                                <SelectContent>
                                  {editingQuotation.transportSummary.vehicles.map((v, i) => (
                                    <SelectItem key={i} value={v.type}>
                                      {v.type} - ₹{v.price ?? v.perKmprice}{" "}
                                      {v.ac ? "(AC)" : "(Non-AC)"}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          {selectedTransportStateId && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t">
                              <div>
                                <Label className="text-sm text-muted-foreground">Current Package</Label>
                                <p className="font-medium mt-1">
                                  {editingQuotation?.transportSummary?.packageName || "—"}
                                </p>
                              </div>
                              <div>
                                <Label className="text-sm text-muted-foreground">AC Status</Label>
                                <p className="font-medium mt-1">
                                  {editingQuotation?.transportSummary?.ac ? "Available" : "Not Available"}
                                </p>
                              </div>
                              <div>
                                <Label className="text-sm text-muted-foreground">Vehicle Cost</Label>
                                <p className="font-medium text-theme-primary mt-1">
                                  ₹{editingQuotation?.transportSummary?.totalPrice || 0}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* ACTIVITIES TAB */}
                <TabsContent value="activities" className="space-y-6">
                  {/* Add Activity */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Add New Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label>Select State</Label>
                          <Select
                            value={SelectedDestination}
                            onValueChange={setSelectedDestination}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select state" />
                            </SelectTrigger>
                            <SelectContent>
                              {AllDestinations.map((state) => (
                                <SelectItem key={state.name} value={state.name}>
                                  {state.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Select Activity</Label>
                          <div className="flex gap-3">
                            <Select
                              value={selectedActivityToAdd}
                              onValueChange={setSelectedActivityToAdd}
                              disabled={!SelectedDestination || isFetchingActivities}
                            >
                              <SelectTrigger className="flex-1">
                                <SelectValue placeholder={
                                  isFetchingActivities ? "Loading..." : "Choose activity..."
                                } />
                              </SelectTrigger>
                              <SelectContent>
                                {availableActivities.map((act) => (
                                  <SelectItem key={act.name} value={act.name}>
                                    {act.name} ({act.city}) - ₹
                                    {act.fitRatePerPerson || act.groupRatePerPerson}/person
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <Button
                              onClick={handleAddActivity}
                              disabled={!selectedActivityToAdd}
                              className="bg-theme-primary hover:bg-theme-secondary"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Activities Table */}
                  {editingQuotation?.activitySummary?.length > 0 ? (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead>Activity</TableHead>
                            <TableHead>Participants</TableHead>
                            <TableHead className="text-right">Total Price</TableHead>
                            <TableHead className="w-16"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {editingQuotation.activitySummary.map((activity, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">
                                {activity.name} <span className="text-muted-foreground">({activity.city})</span>
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="1"
                                  value={activity.participants || 1}
                                  onChange={(e) =>
                                    handleActivitySummaryChange(index, "participants", e.target.value)
                                  }
                                  className="w-24"
                                />
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                ₹{(activity.totalPrice || 0).toFixed(0)}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveActivity(index)}
                                  className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      No activities added yet.
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              {/* Pricing & Grand Total */}
              <Card className="bg-theme-muted/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Pricing Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <Label htmlFor="markup">Add Markup (₹)</Label>
                      <Input
                        id="markup"
                        type="number"
                        placeholder="e.g. 5000"
                        value={editingQuotation?.markup || 0}
                        onChange={(e) => handleMarkupInputChange(e.target.value)}
                        className="text-lg"
                      />
                    </div>

                    <div className="flex flex-col justify-center items-end">
                      <p className="text-sm text-muted-foreground">Grand Total</p>
                      <p className="text-3xl font-bold text-theme-primary mt-1">
                        ₹{(editingQuotation?.grandTotal || 0).toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>

          <DialogFooter className="pt-6 border-t mt-4">
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={handleSaveAs}
              className="border-theme-primary text-theme-primary hover:bg-theme-primary/10"
            >
              Save As New
            </Button>
            <Button
              onClick={handleUpdateQuotation}
              className="bg-theme-primary hover:bg-theme-secondary"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================== SAVE AS NEW MODAL ================== */}
      <Dialog open={showSaveAsModal} onOpenChange={setShowSaveAsModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl text-theme-primary">
              Save as New Quotation
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="newPackageName">New Package Name</Label>
              <Input
                id="newPackageName"
                value={newPackageName}
                onChange={(e) => setNewPackageName(e.target.value)}
                placeholder="Summer Special Goa 2025"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newCustomerName">New Customer Name</Label>
              <Input
                id="newCustomerName"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                placeholder="John Doe"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveAsModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmSaveAs}
              className="bg-theme-primary hover:bg-theme-secondary"
            >
              Save New Quotation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================== VIEW MODAL ================== */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="min-w-5xl max-h-[90vh] overflow-scroll">
          <DialogHeader>
            <DialogTitle className="text-2xl text-theme-primary">
              Quotation for {viewingQuotation?.customerName}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-8 py-6">
            {/* Hotels */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Hotel className="h-5 w-5 text-theme-primary" />
                Hotel Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {viewingQuotation?.hotelSummary?.map((hotel, i) => (
                  <Card key={i} className="border-theme-muted">
                    <CardContent className="pt-6">
                      <h4 className="font-medium">{hotel.hotel}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {hotel.city}, {hotel.state}
                      </p>
                      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Nights:</span>
                          <p className="font-medium">{hotel.nights}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Room:</span>
                          <p className="font-medium">{hotel.selectedRoomCategory}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Meal Plan:</span>
                          <p className="font-medium">{hotel.selectedMealPlan}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Guests:</span>
                          <p className="font-medium">
                            {hotel.numDouble}D, {hotel.numExtraAdult}A, {hotel.numExtraChild}C
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Transport & Activities */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Transport */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Car className="h-5 w-5 text-theme-primary" />
                  Transport
                </h3>
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Vehicle:</span>
                        <span className="font-medium">
                          {viewingQuotation?.transportSummary?.vehicleName || "—"}
                          {viewingQuotation?.transportSummary?.ac && " (AC)"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Cost:</span>
                        <span className="font-medium text-theme-primary">
                          ₹
                          {viewingQuotation?.transportSummary?.pricingType === "perKm"
                            ? (
                                (viewingQuotation.transportSummary?.perKmprice || 0) *
                                (viewingQuotation.transportSummary?.kms || 0)
                              ).toFixed(0)
                            : (viewingQuotation?.transportSummary?.price || 0).toFixed(0)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Activities */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <ActivitySquare className="h-5 w-5 text-theme-primary" />
                  Activities
                </h3>
                {viewingQuotation?.activitySummary?.length > 0 ? (
                  <Card>
                    <CardContent className="pt-6 space-y-4">
                      {viewingQuotation.activitySummary.map((act, i) => (
                        <div key={i} className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">{act.name}</p>
                            <p className="text-sm text-muted-foreground">{act.city}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{act.participants} Person(s)</p>
                            <p className="text-sm text-theme-primary">
                              ₹{act.totalPrice?.toFixed(0)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ) : (
                  <p className="text-muted-foreground text-center py-6">
                    No activities added
                  </p>
                )}
              </div>
            </div>

            {/* Cost Summary */}
            <Card className="bg-theme-muted/30 border-theme-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <IndianRupee className="h-5 w-5 text-theme-primary" />
                  Cost Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Hotel Total:</span>
                    <span>
                      ₹
                      {viewingQuotation?.hotelSummary
                        ?.reduce((sum, h) => sum + (h.hotelTotal || 0), 0)
                        ?.toFixed(0) || "0"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Transport Total:</span>
                    <span>
                      ₹
                      {viewingQuotation?.transportSummary?.pricingType === "perKm"
                        ? (
                            (viewingQuotation.transportSummary?.perKmprice || 0) *
                            (viewingQuotation.transportSummary?.kms || 0)
                          ).toFixed(0)
                        : (viewingQuotation?.transportSummary?.price || 0).toFixed(0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Activity Total:</span>
                    <span>
                      ₹
                      {viewingQuotation?.activitySummary
                        ?.reduce((sum, a) => sum + (a.totalPrice || 0), 0)
                        ?.toFixed(0) || "0"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Markup:</span>
                    <span>₹{viewingQuotation?.markup?.toFixed(0) || "0"}</span>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span className="text-theme-primary">Grand Total:</span>
                    <span className="text-2xl text-theme-primary">
                      ₹{(viewingQuotation?.grandTotal || 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyQuotations;