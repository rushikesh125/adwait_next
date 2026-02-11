"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Hotel,
  Car,
  ActivitySquare,
  Trash2,
  IndianRupee,
} from "lucide-react";

const QuotationModals = ({
  isViewModalOpen,
  setIsViewModalOpen,
  viewingQuotation,
  isEditModalOpen,
  setIsEditModalOpen,
  editingQuotation,
  handleEditChange,
  AllDestinations,
  SelectedDestination,
  setSelectedDestination,
  selectedHotelToAdd,
  setSelectedHotelToAdd,
  allHotels,
  handleAddHotel,
  handleRemoveHotel,
  handleHotelChange,
  handleHotelSummaryChange,
  getAvailableMealPlans,
  toggleValue,
  handleToggle,
  handleTransportSummaryChange,
  selectedTransportStateId,
  setSelectedTransportStateId,
  transportStates,
  toTitleCase,
  handlePackageChange,
  availableTransportPackagesForSelectedState,
  handleVehicleChange,
  isFetchingActivities,
  selectedActivityToAdd,
  setSelectedActivityToAdd,
  availableActivities,
  handleAddActivity,
  handleRemoveActivity,
  handleActivitySummaryChange,
  handleMarkupInputChange,
  handleUpdateQuotation,
  handleSaveAs,
  showSaveAsModal,
  setShowSaveAsModal,
  newPackageName,
  setNewPackageName,
  newCustomerName,
  setNewCustomerName,
  handleConfirmSaveAs,
}) => {
  // Utility function to truncate text
  const truncateText = (text, maxLength) => {
    if (!text) return "";
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  return (
    <>
      {/* ================== VIEW MODAL ================== */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="w-[95vw] max-w-6xl lg:max-w-7xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl sm:text-2xl text-theme-primary break-words">
              Quotation for {truncateText(viewingQuotation?.customerName, 30)}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 sm:space-y-8 py-4 sm:py-6">
            {/* Hotels */}
            <div>
              <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
                <Hotel className="h-4 w-4 sm:h-5 sm:w-5 text-theme-primary flex-shrink-0" />
                <span className="truncate">Hotel Details</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {viewingQuotation?.hotelSummary?.map((hotel, i) => (
                  <Card key={i} className="border-theme-muted">
                    <CardContent className="pt-4 sm:pt-6 p-3 sm:p-6">
                      <h4 className="font-medium text-sm sm:text-base truncate" title={hotel.hotel}>
                        {truncateText(hotel.hotel, 25)}
                      </h4>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1 truncate">
                        {hotel.city}, {hotel.state}
                      </p>
                      <div className="mt-3 sm:mt-4 grid grid-cols-2 gap-2 text-xs sm:text-sm">
                        <div>
                          <span className="text-muted-foreground">Nights:</span>
                          <p className="font-medium">{hotel.nights}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Room:</span>
                          <p className="font-medium truncate" title={hotel.selectedRoomCategory}>
                            {truncateText(hotel.selectedRoomCategory, 12)}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Meal:</span>
                          <p className="font-medium">
                            {hotel.selectedMealPlan}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Guests:</span>
                          <p className="font-medium text-xs">
                            {hotel.numDouble || 0}D, {hotel.numExtraAdult || 0}A,{" "}
                            {hotel.numExtraChild || 0}C
                            {Number(hotel.numCNB) > 0 && `, ${hotel.numCNB} CNB`}
                          </p>
                        </div>
                      </div>

                      {Number(hotel.numCNB) > 0 && hotel.cnbPricePerChild > 0 && (
                        <div className="mt-3 pt-3 border-t text-xs sm:text-sm text-theme-primary/90">
                          <div className="flex justify-between">
                            <span>CNB Charges:</span>
                            <span>
                              ₹
                              {(
                                Number(hotel.numCNB) * Number(hotel.cnbPricePerChild)
                              ).toFixed(0)}
                            </span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Transport & Activities */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              {/* Transport */}
              <div>
                <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
                  <Car className="h-4 w-4 sm:h-5 sm:w-5 text-theme-primary flex-shrink-0" />
                  <span className="truncate">Transport</span>
                </h3>
                <Card>
                  <CardContent className="pt-4 sm:pt-6 p-3 sm:p-6">
                    <div className="space-y-3 text-sm sm:text-base">
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground flex-shrink-0">Vehicle:</span>
                        <span className="font-medium text-right truncate" title={viewingQuotation?.transportSummary?.vehicleName}>
                          {truncateText(viewingQuotation?.transportSummary?.vehicleName || "—", 20)}
                          {viewingQuotation?.transportSummary?.ac && " (AC)"}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground flex-shrink-0">Cost:</span>
                        <span className="font-medium text-theme-primary">
                          ₹
                          {viewingQuotation?.transportSummary?.pricingType ===
                          "perKm"
                            ? (
                                (viewingQuotation.transportSummary?.perKmprice ||
                                  0) *
                                (viewingQuotation.transportSummary?.kms || 0)
                              ).toFixed(0)
                            : (
                                viewingQuotation?.transportSummary?.price || 0
                              ).toFixed(0)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Activities */}
              <div>
                <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
                  <ActivitySquare className="h-4 w-4 sm:h-5 sm:w-5 text-theme-primary flex-shrink-0" />
                  <span className="truncate">Activities</span>
                </h3>
                {viewingQuotation?.activitySummary?.length > 0 ? (
                  <Card>
                    <CardContent className="pt-4 sm:pt-6 p-3 sm:p-6 space-y-3 sm:space-y-4">
                      {viewingQuotation.activitySummary.map((act, i) => (
                        <div
                          key={i}
                          className="flex justify-between items-center gap-2"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm sm:text-base truncate" title={act.name}>
                              {truncateText(act.name, 20)}
                            </p>
                            <p className="text-xs sm:text-sm text-muted-foreground truncate">
                              {act.city}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-medium text-sm sm:text-base">
                              {act.participants} Person(s)
                            </p>
                            <p className="text-xs sm:text-sm text-theme-primary">
                              ₹{act.totalPrice?.toFixed(0)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ) : (
                  <p className="text-muted-foreground text-center py-6 text-sm">
                    No activities added
                  </p>
                )}
              </div>
            </div>

            {/* Cost Summary */}
            <Card className="bg-theme-muted/30 border-theme-primary/20">
              <CardHeader className="pb-3 p-3 sm:p-6">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <IndianRupee className="h-4 w-4 sm:h-5 sm:w-5 text-theme-primary flex-shrink-0" />
                  <span className="truncate">Cost Summary</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6 pt-0">
                <div className="space-y-2 sm:space-y-3 text-sm sm:text-base">
                  <div className="flex justify-between gap-2">
                    <span>Hotel Total:</span>
                    <span>
                      ₹
                      {viewingQuotation?.hotelSummary
                        ?.reduce((sum, h) => sum + (h.hotelTotal || 0), 0)
                        ?.toFixed(0) || "0"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span>Transport Total:</span>
                    <span>
                      ₹
                      {viewingQuotation?.transportSummary?.pricingType ===
                      "perKm"
                        ? (
                            (viewingQuotation.transportSummary?.perKmprice ||
                              0) * (viewingQuotation.transportSummary?.kms || 0)
                          ).toFixed(0)
                        : (
                            viewingQuotation?.transportSummary?.price || 0
                          ).toFixed(0)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span>Activity Total:</span>
                    <span>
                      ₹
                      {viewingQuotation?.activitySummary
                        ?.reduce((sum, a) => sum + (a.totalPrice || 0), 0)
                        ?.toFixed(0) || "0"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span>Markup:</span>
                    <span>₹{viewingQuotation?.markup?.toFixed(0) || "0"}</span>
                  </div>
                </div>
                <div className="pt-3 sm:pt-4 border-t">
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-base sm:text-lg font-bold text-theme-primary">
                      Grand Total:
                    </span>
                    <span className="text-xl sm:text-2xl font-bold text-theme-primary">
                      ₹
                      {(viewingQuotation?.grandTotal || 0).toLocaleString(
                        "en-IN",
                      )}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => setIsViewModalOpen(false)}
              className="w-full sm:w-auto"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================== EDIT MODAL ================== */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="w-[95vw] max-w-6xl lg:max-w-7xl max-h-[90vh] overflow-scroll flex flex-col p-4 sm:p-6">
          <DialogHeader className="pb-3 sm:pb-4 border-b">
            <DialogTitle className="text-xl sm:text-2xl text-theme-primary break-words">
              Edit Quotation
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-2 sm:pr-4 -mr-2 sm:-mr-4">
            <div className="space-y-6 sm:space-y-8 py-4 sm:py-6">
              {/* Customer Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-2">
                  <Label htmlFor="customerName" className="text-sm">Customer Name</Label>
                  <Input
                    id="customerName"
                    name="customerName"
                    value={
                      editingQuotation?.customerName ||
                      editingQuotation?.leadName ||
                      ""
                    }
                    onChange={handleEditChange}
                    className="text-sm sm:text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status" className="text-sm">Status</Label>
                  <Select
                    name="status"
                    value={editingQuotation?.status || "Draft"}
                    onValueChange={(value) =>
                      handleEditChange({ target: { name: "status", value } })
                    }
                  >
                    <SelectTrigger className="text-sm sm:text-base">
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

              <Tabs defaultValue="hotels" className="space-y-4 sm:space-y-6">
                <TabsList className="grid w-full grid-cols-3 h-auto">
                  <TabsTrigger value="hotels" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2">
                    <Hotel className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Hotels</span>
                    <span className="sm:hidden">Hotel</span>
                  </TabsTrigger>
                  <TabsTrigger value="transport" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2">
                    <Car className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Transport</span>
                    <span className="sm:hidden">Trans</span>
                  </TabsTrigger>
                  <TabsTrigger value="activities" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2">
                    <ActivitySquare className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Activities</span>
                    <span className="sm:hidden">Act</span>
                  </TabsTrigger>
                </TabsList>

                {/* HOTELS TAB */}
                <TabsContent value="hotels" className="space-y-4 sm:space-y-6">
                  {/* Add Hotel */}
                  <Card>
                    <CardHeader className="pb-3 p-3 sm:p-6">
                      <CardTitle className="text-base sm:text-lg">Add New Hotel</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 p-3 sm:p-6 pt-0">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm">Select State</Label>
                          <Select
                            value={SelectedDestination}
                            onValueChange={setSelectedDestination}
                          >
                            <SelectTrigger className="text-sm">
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
                          <Label className="text-sm">Select Hotel</Label>
                          <div className="flex gap-2 sm:gap-3">
                            <Select
                              value={selectedHotelToAdd}
                              onValueChange={setSelectedHotelToAdd}
                              disabled={!SelectedDestination}
                            >
                              <SelectTrigger className="flex-1 text-sm">
                                <SelectValue placeholder="Choose hotel..." />
                              </SelectTrigger>
                              <SelectContent>
                                {allHotels
                                  .filter(
                                    (h) => h.state === SelectedDestination,
                                  )
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
                              className="bg-theme-primary hover:bg-theme-secondary flex-shrink-0 text-sm sm:text-base"
                              size="sm"
                            >
                              <Plus className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                              <span className="hidden sm:inline">Add</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Hotels Table - Mobile Responsive */}
                  {editingQuotation?.hotelSummary?.length > 0 ? (
                    <>
                      {/* Desktop Table View */}
                      <div className="hidden lg:block rounded-md border overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50">
                              <TableHead className="min-w-[180px]">Hotel</TableHead>
                              <TableHead className="min-w-[140px]">Room Type</TableHead>
                              <TableHead className="w-20">Nights</TableHead>
                              <TableHead className="w-20">Rooms</TableHead>
                              <TableHead className="w-24">Extra Adults</TableHead>
                              <TableHead className="w-24">Extra Children</TableHead>
                              <TableHead className="w-20">CNB</TableHead>
                              <TableHead className="min-w-[120px]">Meal Plan</TableHead>
                              <TableHead className="text-right min-w-[100px]">Price</TableHead>
                              <TableHead className="w-16"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {editingQuotation.hotelSummary.map((hotel, index) => {
                              const currentHotelData = allHotels.find(
                                (h) =>
                                  h.name === hotel.hotel &&
                                  h.state === hotel.state,
                              );
                              return (
                                <TableRow key={index}>
                                  <TableCell className="font-medium">
                                    <Select
                                      value={
                                        allHotels.find(
                                          (h) =>
                                            h.name === hotel.hotel &&
                                            h.state === hotel.state,
                                        )?.id || ""
                                      }
                                      onValueChange={(val) =>
                                        handleHotelChange(index, val)
                                      }
                                    >
                                      <SelectTrigger className="w-[200px]">
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
                                        handleHotelSummaryChange(
                                          index,
                                          "selectedRoomCategory",
                                          val,
                                        )
                                      }
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {currentHotelData?.rooms?.map((room) => (
                                          <SelectItem
                                            key={room.categoryName}
                                            value={room.categoryName}
                                          >
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
                                        handleHotelSummaryChange(
                                          index,
                                          "nights",
                                          e.target.value,
                                        )
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
                                        handleHotelSummaryChange(
                                          index,
                                          "numDouble",
                                          e.target.value,
                                        )
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
                                        handleHotelSummaryChange(
                                          index,
                                          "numExtraAdult",
                                          e.target.value,
                                        )
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
                                        handleHotelSummaryChange(
                                          index,
                                          "numExtraChild",
                                          e.target.value,
                                        )
                                      }
                                      className="w-20"
                                    />
                                  </TableCell>

                                  <TableCell>
                                    <Input
                                      type="number"
                                      min="0"
                                      value={hotel.numCNB || 0}
                                      onChange={(e) =>
                                        handleHotelSummaryChange(
                                          index,
                                          "numCNB",
                                          e.target.value,
                                        )
                                      }
                                      className="w-20"
                                    />
                                  </TableCell>

                                  <TableCell>
                                    <Select
                                      value={hotel.selectedMealPlan || "EP"}
                                      onValueChange={(val) =>
                                        handleHotelSummaryChange(
                                          index,
                                          "selectedMealPlan",
                                          val,
                                        )
                                      }
                                    >
                                      <SelectTrigger className="w-32">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {getAvailableMealPlans(hotel).map(
                                          (plan) => (
                                            <SelectItem key={plan} value={plan}>
                                              {plan}
                                            </SelectItem>
                                          ),
                                        )}
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
                                      disabled={
                                        editingQuotation.hotelSummary.length <= 1
                                      }
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

                      {/* Mobile Card View */}
                      <div className="lg:hidden space-y-4">
                        {editingQuotation.hotelSummary.map((hotel, index) => {
                          const currentHotelData = allHotels.find(
                            (h) =>
                              h.name === hotel.hotel &&
                              h.state === hotel.state,
                          );
                          return (
                            <Card key={index} className="border-theme-muted">
                              <CardContent className="p-4 space-y-3">
                                <div className="flex justify-between items-start gap-2">
                                  <div className="flex-1 min-w-0 space-y-2">
                                    <Label className="text-xs">Hotel</Label>
                                    <Select
                                      value={
                                        allHotels.find(
                                          (h) =>
                                            h.name === hotel.hotel &&
                                            h.state === hotel.state,
                                        )?.id || ""
                                      }
                                      onValueChange={(val) =>
                                        handleHotelChange(index, val)
                                      }
                                    >
                                      <SelectTrigger className="text-sm">
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
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemoveHotel(index)}
                                    disabled={
                                      editingQuotation.hotelSummary.length <= 1
                                    }
                                    className="text-destructive hover:text-destructive/90 hover:bg-destructive/10 flex-shrink-0"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-2">
                                    <Label className="text-xs">Room Type</Label>
                                    <Select
                                      value={hotel.selectedRoomCategory || ""}
                                      onValueChange={(val) =>
                                        handleHotelSummaryChange(
                                          index,
                                          "selectedRoomCategory",
                                          val,
                                        )
                                      }
                                    >
                                      <SelectTrigger className="text-sm">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {currentHotelData?.rooms?.map((room) => (
                                          <SelectItem
                                            key={room.categoryName}
                                            value={room.categoryName}
                                          >
                                            {room.categoryName}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div className="space-y-2">
                                    <Label className="text-xs">Meal Plan</Label>
                                    <Select
                                      value={hotel.selectedMealPlan || "EP"}
                                      onValueChange={(val) =>
                                        handleHotelSummaryChange(
                                          index,
                                          "selectedMealPlan",
                                          val,
                                        )
                                      }
                                    >
                                      <SelectTrigger className="text-sm">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {getAvailableMealPlans(hotel).map(
                                          (plan) => (
                                            <SelectItem key={plan} value={plan}>
                                              {plan}
                                            </SelectItem>
                                          ),
                                        )}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>

                                <div className="grid grid-cols-4 gap-2">
                                  <div className="space-y-2">
                                    <Label className="text-xs">Nights</Label>
                                    <Input
                                      type="number"
                                      min="1"
                                      value={hotel.nights || 1}
                                      onChange={(e) =>
                                        handleHotelSummaryChange(
                                          index,
                                          "nights",
                                          e.target.value,
                                        )
                                      }
                                      className="text-sm"
                                    />
                                  </div>

                                  <div className="space-y-2">
                                    <Label className="text-xs">Rooms</Label>
                                    <Input
                                      type="number"
                                      min="0"
                                      value={hotel.numDouble || 0}
                                      onChange={(e) =>
                                        handleHotelSummaryChange(
                                          index,
                                          "numDouble",
                                          e.target.value,
                                        )
                                      }
                                      className="text-sm"
                                    />
                                  </div>

                                  <div className="space-y-2">
                                    <Label className="text-xs">Adults</Label>
                                    <Input
                                      type="number"
                                      min="0"
                                      value={hotel.numExtraAdult || 0}
                                      onChange={(e) =>
                                        handleHotelSummaryChange(
                                          index,
                                          "numExtraAdult",
                                          e.target.value,
                                        )
                                      }
                                      className="text-sm"
                                    />
                                  </div>

                                  <div className="space-y-2">
                                    <Label className="text-xs">Child</Label>
                                    <Input
                                      type="number"
                                      min="0"
                                      value={hotel.numExtraChild || 0}
                                      onChange={(e) =>
                                        handleHotelSummaryChange(
                                          index,
                                          "numExtraChild",
                                          e.target.value,
                                        )
                                      }
                                      className="text-sm"
                                    />
                                  </div>
                                </div>

                                <div className="flex justify-between items-center pt-2 border-t">
                                  <span className="text-xs text-muted-foreground">CNB:</span>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={hotel.numCNB || 0}
                                    onChange={(e) =>
                                      handleHotelSummaryChange(
                                        index,
                                        "numCNB",
                                        e.target.value,
                                      )
                                    }
                                    className="w-20 text-sm"
                                  />
                                </div>

                                <div className="flex justify-between items-center pt-2 border-t">
                                  <span className="text-sm font-medium">Total:</span>
                                  <span className="text-lg font-bold text-theme-primary">
                                    ₹{(hotel.hotelTotal || 0).toFixed(0)}
                                  </span>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 sm:py-12 text-muted-foreground text-sm">
                      No hotels added yet. Add your first hotel above.
                    </div>
                  )}
                </TabsContent>

                {/* TRANSPORT TAB */}
                <TabsContent value="transport" className="space-y-4 sm:space-y-6">
                  <Card>
                    <CardHeader className="pb-3 p-3 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <CardTitle className="text-base sm:text-lg">
                          Transportation
                        </CardTitle>
                        <div className="flex items-center gap-3">
                          <span className="text-xs sm:text-sm font-medium">Custom</span>
                          <Switch
                            checked={toggleValue}
                            onCheckedChange={handleToggle}
                          />
                          <span className="text-xs sm:text-sm font-medium">Package</span>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4 sm:space-y-6 p-3 sm:p-6 pt-0">
                      {!toggleValue ? (
                        // Custom Transport
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                          <div className="space-y-2">
                            <Label className="text-sm">Vehicle Name</Label>
                            <Input
                              value={
                                editingQuotation?.transportSummary
                                  ?.vehicleName || ""
                              }
                              onChange={(e) =>
                                handleTransportSummaryChange(
                                  "vehicleName",
                                  e.target.value,
                                )
                              }
                              className="text-sm"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm">Price (₹)</Label>
                            <Input
                              type="number"
                              min="0"
                              value={
                                editingQuotation?.transportSummary?.price || 0
                              }
                              onChange={(e) =>
                                handleTransportSummaryChange(
                                  "price",
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                              className="text-sm"
                            />
                          </div>

                          <div className="flex items-end">
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id="ac"
                                checked={
                                  !!editingQuotation?.transportSummary?.ac
                                }
                                onChange={(e) =>
                                  handleTransportSummaryChange(
                                    "ac",
                                    e.target.checked,
                                  )
                                }
                                className="h-4 w-4 rounded border-gray-300 text-theme-primary focus:ring-theme-primary"
                              />
                              <Label
                                htmlFor="ac"
                                className="text-xs sm:text-sm font-medium"
                              >
                                AC Vehicle
                              </Label>
                            </div>
                          </div>
                        </div>
                      ) : (
                        // Package Transport
                        <div className="space-y-4 sm:space-y-6">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                            <div className="space-y-2">
                              <Label className="text-sm">Select State</Label>
                              <Select
                                value={selectedTransportStateId}
                                onValueChange={setSelectedTransportStateId}
                              >
                                <SelectTrigger className="text-sm">
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
                                <Label className="text-sm">Change Package</Label>
                                <Select
                                  value={
                                    editingQuotation?.transportSummary?.id || ""
                                  }
                                  onValueChange={(val) => {
                                    const e = { target: { value: val } };
                                    handlePackageChange(e);
                                  }}
                                >
                                  <SelectTrigger className="text-sm">
                                    <SelectValue placeholder="Select package" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {availableTransportPackagesForSelectedState.map(
                                      (pkg) => (
                                        <SelectItem key={pkg.id} value={pkg.id}>
                                          {truncateText(pkg.name || pkg.packageName || pkg.id, 30)}
                                        </SelectItem>
                                      ),
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </div>

                          {editingQuotation?.transportSummary?.vehicles
                            ?.length > 0 && (
                            <div className="space-y-2">
                              <Label className="text-sm">Select Vehicle</Label>
                              <Select
                                value={
                                  editingQuotation?.transportSummary
                                    ?.selectedVehicle?.type || ""
                                }
                                onValueChange={(val) => {
                                  const vehicle =
                                    editingQuotation.transportSummary.vehicles.find(
                                      (v) => v.type === val,
                                    );
                                  if (vehicle) handleVehicleChange(vehicle);
                                }}
                              >
                                <SelectTrigger className="text-sm">
                                  <SelectValue placeholder="Select vehicle" />
                                </SelectTrigger>
                                <SelectContent>
                                  {editingQuotation.transportSummary.vehicles.map(
                                    (v, i) => (
                                      <SelectItem key={i} value={v.type}>
                                        {v.type} - ₹{v.price ?? v.perKmprice}{" "}
                                        {v.ac ? "(AC)" : "(Non-AC)"}
                                      </SelectItem>
                                    ),
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          {selectedTransportStateId && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 pt-4 border-t">
                              <div>
                                <Label className="text-xs text-muted-foreground">
                                  Current Package
                                </Label>
                                <p className="font-medium mt-1 text-sm truncate" title={editingQuotation?.transportSummary?.packageName}>
                                  {truncateText(editingQuotation?.transportSummary?.packageName || "—", 20)}
                                </p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">
                                  AC Status
                                </Label>
                                <p className="font-medium mt-1 text-sm">
                                  {editingQuotation?.transportSummary?.ac
                                    ? "Available"
                                    : "Not Available"}
                                </p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">
                                  Vehicle Cost
                                </Label>
                                <p className="font-medium text-theme-primary mt-1 text-sm">
                                  ₹
                                  {editingQuotation?.transportSummary
                                    ?.totalPrice || 0}
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
                <TabsContent value="activities" className="space-y-4 sm:space-y-6">
                  {/* Add Activity */}
                  <Card>
                    <CardHeader className="pb-3 p-3 sm:p-6">
                      <CardTitle className="text-base sm:text-lg">
                        Add New Activity
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-6 pt-0">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        <div className="space-y-2">
                          <Label className="text-sm">Select State</Label>
                          <Select
                            value={SelectedDestination}
                            onValueChange={setSelectedDestination}
                          >
                            <SelectTrigger className="text-sm">
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
                          <Label className="text-sm">Select Activity</Label>
                          <div className="flex gap-2 sm:gap-3">
                            <Select
                              value={selectedActivityToAdd}
                              onValueChange={setSelectedActivityToAdd}
                              disabled={
                                !SelectedDestination || isFetchingActivities
                              }
                            >
                              <SelectTrigger className="flex-1 text-sm">
                                <SelectValue
                                  placeholder={
                                    isFetchingActivities
                                      ? "Loading..."
                                      : "Choose activity..."
                                  }
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {availableActivities.map((act) => (
                                  <SelectItem key={act.name} value={act.name}>
                                    {act.name} ({act.city}) - ₹
                                    {act.fitRatePerPerson ||
                                      act.groupRatePerPerson}
                                    /person
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <Button
                              onClick={handleAddActivity}
                              disabled={!selectedActivityToAdd}
                              className="bg-theme-primary hover:bg-theme-secondary flex-shrink-0"
                              size="sm"
                            >
                              <Plus className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                              <span className="hidden sm:inline">Add</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Activities Table/Cards */}
                  {editingQuotation?.activitySummary?.length > 0 ? (
                    <>
                      {/* Desktop Table */}
                      <div className="hidden md:block rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50">
                              <TableHead>Activity</TableHead>
                              <TableHead>Participants</TableHead>
                              <TableHead className="text-right">
                                Total Price
                              </TableHead>
                              <TableHead className="w-16"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {editingQuotation.activitySummary.map(
                              (activity, index) => (
                                <TableRow key={index}>
                                  <TableCell className="font-medium">
                                    <span className="block truncate max-w-[200px]" title={activity.name}>
                                      {activity.name}
                                    </span>
                                    <span className="text-muted-foreground text-sm">
                                      ({activity.city})
                                    </span>
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      type="number"
                                      min="1"
                                      value={activity.participants || 1}
                                      onChange={(e) =>
                                        handleActivitySummaryChange(
                                          index,
                                          "participants",
                                          e.target.value,
                                        )
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
                              ),
                            )}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Mobile Cards */}
                      <div className="md:hidden space-y-3">
                        {editingQuotation.activitySummary.map(
                          (activity, index) => (
                            <Card key={index} className="border-theme-muted">
                              <CardContent className="p-4">
                                <div className="flex justify-between items-start gap-2 mb-3">
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-sm truncate" title={activity.name}>
                                      {activity.name}
                                    </h4>
                                    <p className="text-xs text-muted-foreground">
                                      {activity.city}
                                    </p>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemoveActivity(index)}
                                    className="text-destructive hover:text-destructive/90 hover:bg-destructive/10 flex-shrink-0 h-8 w-8"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                                <div className="flex justify-between items-center gap-4">
                                  <div className="flex-1">
                                    <Label className="text-xs">Participants</Label>
                                    <Input
                                      type="number"
                                      min="1"
                                      value={activity.participants || 1}
                                      onChange={(e) =>
                                        handleActivitySummaryChange(
                                          index,
                                          "participants",
                                          e.target.value,
                                        )
                                      }
                                      className="mt-1 text-sm"
                                    />
                                  </div>
                                  <div className="text-right">
                                    <Label className="text-xs text-muted-foreground">Total</Label>
                                    <p className="font-bold text-theme-primary mt-1">
                                      ₹{(activity.totalPrice || 0).toFixed(0)}
                                    </p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ),
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 sm:py-12 text-muted-foreground text-sm">
                      No activities added yet.
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              {/* Pricing & Grand Total */}
              <Card className="bg-theme-muted/30">
                <CardHeader className="pb-3 p-3 sm:p-6">
                  <CardTitle className="text-base sm:text-lg">Pricing Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 sm:space-y-6 p-3 sm:p-6 pt-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
                    <div className="space-y-2">
                      <Label htmlFor="markup" className="text-sm">Add Markup (₹)</Label>
                      <Input
                        id="markup"
                        type="number"
                        placeholder="e.g. 5000"
                        value={editingQuotation?.markup || 0}
                        onChange={(e) =>
                          handleMarkupInputChange(e.target.value)
                        }
                        className="text-base sm:text-lg"
                      />
                    </div>

                    <div className="flex flex-col justify-center items-start sm:items-end">
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Grand Total
                      </p>
                      <p className="text-2xl sm:text-3xl font-bold text-theme-primary mt-1">
                        ₹
                        {(editingQuotation?.grandTotal || 0).toLocaleString(
                          "en-IN",
                        )}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>

          <DialogFooter className="pt-4 sm:pt-6 border-t mt-4 flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsEditModalOpen(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={handleSaveAs}
              className="border-theme-primary text-theme-primary hover:bg-theme-primary/10 w-full sm:w-auto"
            >
              Save As New
            </Button>
            <Button
              onClick={handleUpdateQuotation}
              className="bg-theme-primary hover:bg-theme-secondary w-full sm:w-auto"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================== SAVE AS NEW MODAL ================== */}
      <Dialog open={showSaveAsModal} onOpenChange={setShowSaveAsModal}>
        <DialogContent className="w-[95vw] max-w-md p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl text-theme-primary">
              Save as New Quotation
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 sm:space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="newPackageName" className="text-sm">New Package Name</Label>
              <Input
                id="newPackageName"
                value={newPackageName}
                onChange={(e) => setNewPackageName(e.target.value)}
                placeholder="Summer Special Goa 2025"
                className="text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newCustomerName" className="text-sm">New Customer Name</Label>
              <Input
                id="newCustomerName"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                placeholder="John Doe"
                className="text-sm"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => setShowSaveAsModal(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmSaveAs}
              className="bg-theme-primary hover:bg-theme-secondary w-full sm:w-auto"
            >
              Save New Quotation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default QuotationModals;