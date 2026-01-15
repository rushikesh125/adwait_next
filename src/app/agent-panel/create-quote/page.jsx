"use client";
import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { fetchAllHotels, fetchLocations, fetchActivities } from "@/firebase/resources";
import { saveNewQuote } from "@/firebase/quotes";
import toast from "react-hot-toast";

// Components
import HotelSection from "@/components/HotelSection";
import TransportSection from "@/components/TransportSection";
import MarkupSection from "@/components/MarkupSection"; // You'd adapt the provided code similarly
// ... Import ActivitySection ...
import ActivitySection from "@/components/ActivitySection";
const CreateQuotePage = () => {
  const { user } = useSelector((state) => state.auth);
  const router = useRouter();

  // Data Loading
  const [loading, setLoading] = useState(true);
  const [hotels, setHotels] = useState([]);
  const [locations, setLocations] = useState([]);
  const [activitiesData, setActivitiesData] = useState([]);

  // Form State
  const [checkInDate, setCheckInDate] = useState(new Date().toISOString().split('T')[0]);
  const [hotelEntries, setHotelEntries] = useState([]);
  const [transport, setTransport] = useState(null);
  const [selectedActivities, setSelectedActivities] = useState([]);
  const [markup, setMarkup] = useState(0);
  const [clientInfo, setClientInfo] = useState({ name: "", packageTitle: "" });
const [activityTotalCost, setActivityTotalCost] = useState(0);

const handleActivitiesChange = (items, total) => {
  setSelectedActivities(items);
  setActivityTotalCost(total);
};
  useEffect(() => {
    const loadData = async () => {
      try {
        const [h, l, a] = await Promise.all([fetchAllHotels(), fetchLocations(), fetchActivities()]);
        setHotels(h);
        setLocations(l);
        setActivitiesData(a);
      } catch (e) {
        console.error(e);
        toast.error("Failed to load resources");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Totals
  const hotelTotal = hotelEntries.reduce((sum, h) => sum + h.totalCost, 0);
  const transportTotal = transport ? transport.totalPrice : 0;
  const activityTotal = selectedActivities.reduce((sum, a) => sum + a.totalPrice, 0);
  const grandTotal = hotelTotal + transportTotal + activityTotal + markup;

  const handleSave = async () => {
    if (!user) return toast.error("Not logged in");
    if (!clientInfo.name || !clientInfo.packageTitle) return toast.error("Client Details missing");
    
    try {
      const quoteData = {
        customerName: clientInfo.name,
        packageName: clientInfo.packageTitle,
        hotelSummary: hotelEntries,
        transportSummary: transport,
        activitySummary: selectedActivities,
        markup,
        grandTotal,
        // ... any other fields needed
      };
      
      await saveNewQuote(user.uid, quoteData);
      toast.success("Quote Saved Successfully!");
      router.push("/dashboard/my-quotes");
    } catch (error) {
      toast.error("Error saving quote");
    }
  };

  if (loading) return <div className="p-10 text-center text-theme-primary">Loading Resources...</div>;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 pb-24">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-theme-dark">Create New Quotation</h1>
        <p className="text-gray-500">Craft a perfect itinerary for your clients.</p>
      </header>

      {/* Client Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 bg-white p-4 rounded-lg shadow-sm border">
        <input 
          placeholder="Client Name" 
          className="border p-2 rounded" 
          value={clientInfo.name} 
          onChange={e=>setClientInfo({...clientInfo, name:e.target.value})}
        />
        <input 
          placeholder="Package Title (e.g. Goa Blast)" 
          className="border p-2 rounded" 
          value={clientInfo.packageTitle} 
          onChange={e=>setClientInfo({...clientInfo, packageTitle:e.target.value})}
        />
      </div>

      <HotelSection 
        hotels={hotels} 
        locations={locations} 
        hotelEntries={hotelEntries} 
        setHotelEntries={setHotelEntries}
        checkInDate={checkInDate}
        setCheckInDate={setCheckInDate}
      />

      <TransportSection 
        locations={locations} 
        selectedTransport={transport} 
        onTransportSelect={setTransport} 
      />

      {/* Place ActivitySection here similarly */}
<ActivitySection onActivitiesChange={handleActivitiesChange} />
<MarkupSection 
   grandTotal={hotelTotal + transportTotal + activityTotalCost} 
   setMarkupAmount={setMarkup} 
/>
      {/* Markup & Total */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t p-4 shadow-lg z-50">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex gap-4 text-sm">
             <div>Hotels: <strong>₹{hotelTotal}</strong></div>
             <div>Transport: <strong>₹{transportTotal}</strong></div>
             <div>Markup: <strong>₹{markup}</strong></div>
          </div>
          <div className="text-2xl font-bold text-theme-dark">
            Total: ₹{grandTotal.toLocaleString()}
          </div>
          <div className="flex gap-2">
            <MarkupSection grandTotal={grandTotal - markup} setMarkupAmount={setMarkup} />
            <button 
              onClick={handleSave} 
              className="bg-theme-gradient-from bg-gradient-to-r from-theme-gradient-from to-theme-gradient-to text-white px-6 py-2 rounded shadow-lg hover:shadow-xl transition"
            >
              Save Quote
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateQuotePage;