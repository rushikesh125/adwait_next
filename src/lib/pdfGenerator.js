// components/dashboard/CreatePackage/DateSelector.jsx
'use client';

import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Calendar, Moon } from 'lucide-react';
import { calculateCheckoutDate } from '@/lib/calculations';

export default function DateSelector({
  checkInDate,
  setCheckInDate,
  nights,
  setNights,
  checkOutDate,
  setCheckOutDate,
}) {
  // Auto-calculate checkout date when check-in or nights change
  useEffect(() => {
    if (checkInDate && nights) {
      const calculatedCheckout = calculateCheckoutDate(checkInDate, nights);
      setCheckOutDate(calculatedCheckout);
    }
  }, [checkInDate, nights, setCheckOutDate]);

  return (
    <Card className="border-theme-accent/20 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="bg-gradient-to-r from-theme-gradient-from/5 to-theme-gradient-to/5">
        <CardTitle className="text-lg font-semibold text-theme-dark flex items-center gap-2">
          <Calendar className="w-5 h-5 text-theme-primary" />
          Travel Dates
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Check-in Date */}
          <div className="space-y-2">
            <Label htmlFor="checkInDate" className="text-sm font-medium text-gray-700">
              Check-in Date
            </Label>
            <div className="relative">
              <Input
                id="checkInDate"
                type="date"
                value={checkInDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setCheckInDate(e.target.value)}
                className="pl-10 border-theme-accent/30 focus:border-theme-primary focus:ring-theme-primary"
              />
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-primary pointer-events-none" />
            </div>
          </div>

          {/* Number of Nights */}
          <div className="space-y-2">
            <Label htmlFor="nights" className="text-sm font-medium text-gray-700">
              Number of Nights
            </Label>
            <div className="relative">
              <Input
                id="nights"
                type="number"
                min={1}
                value={nights}
                onChange={(e) => setNights(parseInt(e.target.value) || 1)}
                className="pl-10 border-theme-accent/30 focus:border-theme-primary focus:ring-theme-primary"
              />
              <Moon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-primary pointer-events-none" />
            </div>
          </div>

          {/* Check-out Date (Read-only) */}
          <div className="space-y-2">
            <Label htmlFor="checkOutDate" className="text-sm font-medium text-gray-700">
              Check-out Date
            </Label>
            <div className="relative">
              <Input
                id="checkOutDate"
                type="date"
                value={checkOutDate}
                readOnly
                className="pl-10 bg-theme-muted border-theme-accent/30 cursor-not-allowed"
              />
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-secondary pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Info Message */}
        {checkInDate && nights && checkOutDate && (
          <div className="mt-4 p-3 bg-theme-muted rounded-lg border border-theme-accent/20">
            <p className="text-sm text-theme-dark">
              <span className="font-semibold">Duration:</span> {nights} night{nights > 1 ? 's' : ''} from{' '}
              <span className="font-medium text-theme-primary">{checkInDate}</span> to{' '}
              <span className="font-medium text-theme-primary">{checkOutDate}</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}