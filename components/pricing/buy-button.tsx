"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

const TITLE = "Payments are coming soon";
const MESSAGE =
  "You were not charged and your balance has not changed. Credit packs will be available to buy here soon.";

/**
 * Buy for one credit pack (spec 0005). Payments do not exist yet, so it only opens a
 * coming soon dialog: no request is sent and no balance changes. The Dialog returns
 * focus to this button when it closes.
 */
export function BuyButton({ packName, popular }: { packName: string; popular: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant={popular ? "primary" : "secondary"}
        aria-label={`Buy ${packName}`}
        aria-haspopup="dialog"
        className="w-full"
        onClick={() => setOpen(true)}
      >
        Buy
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={TITLE} description={MESSAGE}>
        <div className="flex justify-end">
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            Close
          </Button>
        </div>
      </Dialog>
    </>
  );
}
