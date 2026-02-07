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
  return (
    <>
      {/* ================== VIEW MODAL ================== */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className=" lg:min-w-5xl max-h-[90vh] overflow-scroll">
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
                          <p className="font-medium">
                            {hotel.selectedRoomCategory}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Meal Plan:
                          </span>
                          <p className="font-medium">
                            {hotel.selectedMealPlan}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Guests:</span>
                          <p className="font-medium">
                            {hotel.numDouble}D, {hotel.numExtraAdult}A,{" "}
                            {hotel.numExtraChild}C
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
                          {viewingQuotation?.transportSummary?.vehicleName ||
                            "—"}
                          {viewingQuotation?.transportSummary?.ac && " (AC)"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Cost:</span>
                        <span className="font-medium text-theme-primary">
                          ₹
                          {viewingQuotation?.transportSummary?.pricingType ===
                          "perKm"
                            ? (
                                (viewingQuotation.transportSummary
                                  ?.perKmprice || 0) *
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
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <ActivitySquare className="h-5 w-5 text-theme-primary" />
                  Activities
                </h3>
                {viewingQuotation?.activitySummary?.length > 0 ? (
                  <Card>
                    <CardContent className="pt-6 space-y-4">
                      {viewingQuotation.activitySummary.map((act, i) => (
                        <div
                          key={i}
                          className="flex justify-between items-center"
                        >
                          <div>
                            <p className="font-medium">{act.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {act.city}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">
                              {act.participants} Person(s)
                            </p>
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

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================== EDIT MODAL ================== */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="md:min-w-6xl max-h-[90vh] overflow-scroll flex flex-col">
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
                    value={
                      editingQuotation?.customerName ||
                      editingQuotation?.leadName ||
                      ""
                    }
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
                        <CardTitle className="text-lg">
                          Transportation
                        </CardTitle>
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
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Price (₹)</Label>
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
                                className="text-sm font-medium"
                              >
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
                                  value={
                                    editingQuotation?.transportSummary?.id || ""
                                  }
                                  onValueChange={(val) => {
                                    const e = { target: { value: val } };
                                    handlePackageChange(e);
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select package" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {availableTransportPackagesForSelectedState.map(
                                      (pkg) => (
                                        <SelectItem key={pkg.id} value={pkg.id}>
                                          {pkg.name ||
                                            pkg.packageName ||
                                            pkg.id}
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
                              <Label>Select Vehicle</Label>
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
                                <SelectTrigger>
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
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t">
                              <div>
                                <Label className="text-sm text-muted-foreground">
                                  Current Package
                                </Label>
                                <p className="font-medium mt-1">
                                  {editingQuotation?.transportSummary
                                    ?.packageName || "—"}
                                </p>
                              </div>
                              <div>
                                <Label className="text-sm text-muted-foreground">
                                  AC Status
                                </Label>
                                <p className="font-medium mt-1">
                                  {editingQuotation?.transportSummary?.ac
                                    ? "Available"
                                    : "Not Available"}
                                </p>
                              </div>
                              <div>
                                <Label className="text-sm text-muted-foreground">
                                  Vehicle Cost
                                </Label>
                                <p className="font-medium text-theme-primary mt-1">
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
                <TabsContent value="activities" className="space-y-6">
                  {/* Add Activity */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">
                        Add New Activity
                      </CardTitle>
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
                              disabled={
                                !SelectedDestination || isFetchingActivities
                              }
                            >
                              <SelectTrigger className="flex-1">
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
                                  {activity.name}{" "}
                                  <span className="text-muted-foreground">
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
                        onChange={(e) =>
                          handleMarkupInputChange(e.target.value)
                        }
                        className="text-lg"
                      />
                    </div>

                    <div className="flex flex-col justify-center items-end">
                      <p className="text-sm text-muted-foreground">
                        Grand Total
                      </p>
                      <p className="text-3xl font-bold text-theme-primary mt-1">
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
    </>
  );
};

export default QuotationModals;
