import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LeadForm({ form, onChange, onSubmit }) {
  return (
    <div className="w-full">
      <div className="w-full max-w-4xl mx-auto bg-white p-8 rounded-2xl shadow-md border">

        <h3 className="text-xl font-semibold text-theme-dark mb-6 text-center">
          Add New Lead
        </h3>

        <form
          onSubmit={onSubmit}
          noValidate
          className="grid grid-cols-1 md:grid-cols-2 gap-5"
        >
          {/* Name */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Lead Name</label>
            <Input
              name="name"
              value={form.name}
              placeholder="Lead name"
              onChange={onChange}
              required
            />
          </div>

          {/* Travel To */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Travel To</label>
            <Input
              name="Destination"
              value={form.Destination}
              placeholder="Destination"
              onChange={onChange}
              required
            />
          </div>

          {/* Travel Date */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Travel Date</label>
            <Input
              type="date"
              name="travelDate"
              value={form.travelDate}
              onChange={onChange}
              required
            />
          </div>

          {/* Number of Days */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Number of Days</label>
            <Input
              type="number"
              name="days"
              value={form.days}
              placeholder="Total days"
              onChange={onChange}
              required
            />
          </div>

          {/* Adults */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Adults</label>
            <Input
              type="number"
              name="adults"
              value={form.adults}
              placeholder="No. of adults"
              onChange={onChange}
              required
            />
          </div>

          {/* Hotel Preference */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Hotel Preference</label>
            <Input
              name="hotelPreference"
              value={form.hotelPreference}
              placeholder="3 Star / 4 Star / 5 Star"
              onChange={onChange}
            />
          </div>

          {/* Flight / Train Preference */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">
              Flight / Train Preference
            </label>
            <Input
              name="transportPreference"
              value={form.transportPreference}
              placeholder="Flight / Train"
              onChange={onChange}
            />
          </div>

          {/* Budget */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Budget</label>
            <Input
              type="number"
              name="budget"
              value={form.budget}
              placeholder="Budget"
              onChange={onChange}
            />
          </div>

          {/* Additional Requirements */}
          <div className="flex flex-col gap-1 md:col-span-2">
            <label className="text-sm font-medium">
              Additional Requirements
            </label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={onChange}
              placeholder="Any special requirements"
              className="border rounded-md p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-theme-primary"
              rows={4}
            />
          </div>

          {/* Submit */}
          <div className="md:col-span-2 flex justify-end">
            <Button size="lg" className="bg-theme-primary text-white">
              Save Lead
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
