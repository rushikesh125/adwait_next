import React, { useState, useEffect, useMemo } from "react";
import { 
  CheckCircle2, 
  Users, 
  User, 
  MapPin, 
  ChevronRight, 
  Loader2, 
  ShoppingCart, 
  Trash2 
} from "lucide-react";

// Shadcn UI Components (Assuming standard installation paths)
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

// Firebase Services
import { fetchAllStates, fetchActivitiesByState } from "@/firebase/activities_service";

const SelectActivities = ({ onDone }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedState, setSelectedState] = useState("");
  const [states, setStates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activities, setActivities] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  
  // State for selections
  const [selectedActivitiesfit, setSelectedActivitiesfit] = useState([]);
  const [selectedActivitiesgroup, setSelectedActivitiesgroup] = useState([]);
  const [pricingType, setPricingType] = useState("fit");

  // Load States
  useEffect(() => {
    if (showDropdown && states.length === 0) {
      setLoading(true);
      fetchAllStates()
        .then(setStates)
        .finally(() => setLoading(false));
    }
  }, [showDropdown, states.length]);

  // Load Activities when state changes
  useEffect(() => {
    if (selectedState) {
      setActivityLoading(true);
      fetchActivitiesByState(selectedState)
        .then(setActivities)
        .finally(() => setActivityLoading(false));
    }
  }, [selectedState]);

  // Logic for Toggling Selection
  const handleToggle = (act, type) => {
    const isFit = type === "fit";
    const setter = isFit ? setSelectedActivitiesfit : setSelectedActivitiesgroup;
    const currentList = isFit ? selectedActivitiesfit : selectedActivitiesgroup;
    
    const exists = currentList.find((a) => a.name === act.name);
    if (exists) {
      setter((prev) => prev.filter((a) => a.name !== act.name));
    } else {
      setter((prev) => [
        ...prev,
        { ...act, participants: isFit ? 1 : 10 }
      ]);
    }
  };

  const handleQtyChange = (name, val, type) => {
    const setter = type === "fit" ? setSelectedActivitiesfit : setSelectedActivitiesgroup;
    const min = type === "fit" ? 1 : 10;
    setter((prev) =>
      prev.map((a) => (a.name === name ? { ...a, participants: Math.max(min, parseInt(val) || min) } : a))
    );
  };

  // Calculations
  const totalFIT = selectedActivitiesfit.reduce((s, a) => s + (parseFloat(a.fitRatePerPerson) * a.participants), 0);
  const totalGroup = selectedActivitiesgroup.reduce((s, a) => s + (parseFloat(a.groupRatePerPerson) * a.participants), 0);
  const totalOverall = totalFIT + totalGroup;

  const handleFinalize = () => {
    const final = [
      ...selectedActivitiesfit.map(a => ({...a, type: 'fit', totalPrice: a.participants * a.fitRatePerPerson})),
      ...selectedActivitiesgroup.map(a => ({...a, type: 'group', totalPrice: a.participants * a.groupRatePerPerson}))
    ];
    onDone(final, totalOverall);
  };

  if (!showDropdown) {
    return (
      <Button 
        onClick={() => setShowDropdown(true)} 
        className="bg-theme-primary hover:bg-theme-secondary text-white px-8 py-6 rounded-xl shadow-lg transition-all"
      >
        <MapPin className="mr-2 h-5 w-5" />
        Start Selecting Activities
      </Button>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* State Selector */}
      <Card className="border-none shadow-sm bg-theme-muted/30">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium text-theme-dark mb-1.5 block">Region/State</label>
              <Select onValueChange={setSelectedState} value={selectedState}>
                <SelectTrigger className="w-full bg-white border-theme-accent/20">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <SelectValue placeholder="Where are you going?" />}
                </SelectTrigger>
                <SelectContent>
                  {states.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {selectedState && (
              <Badge variant="outline" className="h-fit py-1.5 px-3 border-theme-primary text-theme-primary bg-white">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Exploring {selectedState}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedState && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Selection Area */}
          <Card className="lg:col-span-2 shadow-md border-theme-muted">
            <CardHeader className="pb-3">
              <CardTitle className="text-theme-dark flex items-center gap-2">
                Available Activities
              </CardTitle>
              <CardDescription>Choose between Individual (FIT) or Group pricing</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="fit" onValueChange={setPricingType} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6 bg-theme-muted">
                  <TabsTrigger value="fit" className="data-[state=active]:bg-theme-primary data-[state=active]:text-white">
                    <User className="h-4 w-4 mr-2" /> FIT
                  </TabsTrigger>
                  <TabsTrigger value="group" className="data-[state=active]:bg-theme-primary data-[state=active]:text-white">
                    <Users className="h-4 w-4 mr-2" /> Group (10+)
                  </TabsTrigger>
                </TabsList>

                {activityLoading ? (
                  <div className="flex flex-col items-center py-20 text-theme-accent">
                    <Loader2 className="h-8 w-8 animate-spin mb-2" />
                    <p>Fetching activities...</p>
                  </div>
                ) : (
                  ["fit", "group"].map((type) => (
                    <TabsContent key={type} value={type} className="mt-0">
                      <ScrollArea className="h-[400px] pr-4">
                        <div className="space-y-3">
                          {activities.map((act) => {
                            const isSelected = (type === 'fit' ? selectedActivitiesfit : selectedActivitiesgroup).some(a => a.name === act.name);
                            const isDisabled = (type === 'fit' ? selectedActivitiesgroup : selectedActivitiesfit).some(a => a.name === act.name);
                            
                            return (
                              <div 
                                key={act.name}
                                className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                                  isSelected ? 'border-theme-primary bg-theme-muted/50 shadow-sm' : 'border-slate-100 hover:border-theme-accent/50'
                                } ${isDisabled ? 'opacity-40 grayscale pointer-events-none' : ''}`}
                              >
                                <div className="flex-1">
                                  <h4 className="font-bold text-theme-dark">{act.name}</h4>
                                  <p className="text-xs text-slate-500 flex items-center">
                                    <MapPin className="h-3 w-3 mr-1" /> {act.city}
                                  </p>
                                  <div className="mt-1 text-theme-primary font-semibold">
                                    ₹{type === 'fit' ? act.fitRatePerPerson : act.groupRatePerPerson} 
                                    <span className="text-[10px] text-slate-400 ml-1">/ person</span>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-3">
                                  {isSelected && (
                                    <Input
                                      type="number"
                                      className="w-20 h-9 bg-white"
                                      value={(type === 'fit' ? selectedActivitiesfit : selectedActivitiesgroup).find(a => a.name === act.name)?.participants}
                                      onChange={(e) => handleQtyChange(act.name, e.target.value, type)}
                                    />
                                  )}
                                  <Button 
                                    size="sm"
                                    variant={isSelected ? "destructive" : "outline"}
                                    className={!isSelected ? "border-theme-primary text-theme-primary hover:bg-theme-primary hover:text-white" : ""}
                                    onClick={() => handleToggle(act, type)}
                                  >
                                    {isSelected ? <Trash2 className="h-4 w-4" /> : "Select"}
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    </TabsContent>
                  ))
                )}
              </Tabs>
            </CardContent>
          </Card>

          {/* Checkout/Summary Area */}
          <div className="space-y-4">
            <Card className="border-none bg-theme-dark text-white shadow-xl overflow-hidden sticky top-4">
              <div className="bg-theme-primary p-4 flex items-center justify-between">
                <h3 className="font-bold flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" /> Summary
                </h3>
                <Badge className="bg-white text-theme-dark">{selectedActivitiesfit.length + selectedActivitiesgroup.length} Items</Badge>
              </div>
              <CardContent className="p-0">
                <ScrollArea className="h-[300px] px-4 py-4">
                  {[...selectedActivitiesfit, ...selectedActivitiesgroup].length === 0 ? (
                    <div className="text-center py-10 text-theme-muted/50 italic text-sm">
                      No activities selected yet
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {selectedActivitiesfit.map(a => (
                        <div key={a.name} className="flex justify-between text-sm">
                          <div>
                            <p className="font-medium">{a.name}</p>
                            <p className="text-[10px] text-theme-accent">FIT • {a.participants} Pax</p>
                          </div>
                          <span>₹{a.participants * a.fitRatePerPerson}</span>
                        </div>
                      ))}
                      {selectedActivitiesgroup.map(a => (
                        <div key={a.name} className="flex justify-between text-sm">
                          <div>
                            <p className="font-medium">{a.name}</p>
                            <p className="text-[10px] text-emerald-400">GROUP • {a.participants} Pax</p>
                          </div>
                          <span>₹{a.participants * a.groupRatePerPerson}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
                
                <div className="p-4 bg-white/10 mt-auto border-t border-white/10">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-theme-muted text-sm font-light">Total Investment</span>
                    <span className="text-2xl font-bold text-white">₹{totalOverall.toLocaleString()}</span>
                  </div>
                  <Button 
                    disabled={totalOverall === 0}
                    onClick={handleFinalize}
                    className="w-full bg-white text-theme-dark hover:bg-theme-muted py-6 font-bold uppercase tracking-wider"
                  >
                    Confirm & Proceed <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default SelectActivities;