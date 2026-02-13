import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, Clock, CheckCircle2 } from 'lucide-react';

export default function ConsultantScheduling() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-3 rounded-lg bg-primary/10">
              <Phone className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg">Book a Call with TaxAware NG</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Schedule a one-on-one consultation to discuss your tax questions
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
              <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">Pick a Time</p>
                <p className="text-xs text-muted-foreground">Choose from available slots</p>
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
              <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">Share Your Details</p>
                <p className="text-xs text-muted-foreground">Name, email & topic</p>
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
              <Clock className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">Get Confirmation</p>
                <p className="text-xs text-muted-foreground">Calendar invite sent instantly</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg overflow-hidden border border-border">
            <iframe
              src="https://calendar.google.com/calendar/appointments/schedules/AcZssZ1jAw423pxGILK26uCuth0oSMBTJmQ9_4VCMtw-prhXJmecLeIHdD6HjBl1wJLVegCgEgsZisit?gv=true"
              style={{ border: 0 }}
              width="100%"
              height="600"
              frameBorder="0"
              title="Book a consultation with TaxAware NG"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
