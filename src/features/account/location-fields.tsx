"use client";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { HOSTELS, PHASE_NOTICE, type User } from "../../domain/shared";

export function LocationFields({
  initial,
  preferredHostel = "",
}: {
  initial?: User;
  preferredHostel?: string;
}) {
  const [locationHostel, setLocationHostel] = useState(
    initial?.hostel || preferredHostel,
  );
  return (
    <>
      <label>
        Hostel
        <select
          name="hostel"
          required
          value={locationHostel}
          onChange={(e) => setLocationHostel(e.target.value)}
        >
          <option value="" disabled>
            Choose your bhawan
          </option>
          {HOSTELS.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>
      </label>
      <div className="form-grid">
        <label>
          Room No.
          <input
            name="room"
            required
            maxLength={24}
            defaultValue={initial?.room || ""}
            placeholder="e.g. 224 or B-12"
          />
        </label>
        <label>
          Wing
          <input
            name="wing"
            required
            maxLength={24}
            defaultValue={initial?.wing || ""}
            placeholder="e.g. A, East or 09"
          />
        </label>
      </div>
      {locationHostel === "mandakini" && (
        <>
          <label>
            Phase
            <select name="phase" required defaultValue={initial?.phase || ""}>
              <option value="" disabled>
                Choose your phase
              </option>
              {["1", "2", "3"].map((p) => (
                <option key={p} value={p}>
                  Phase {p}
                </option>
              ))}
            </select>
          </label>
          <PhaseNotice compact />
        </>
      )}
      <p className="location-hint">
        Use your hostel’s own room and wing labels. Room numbers may repeat
        across wings or phases.
      </p>
    </>
  );
}
export function PhaseNotice({ compact = false }: { compact?: boolean }) {
  return (
    <aside className={"phase-notice " + (compact ? "compact" : "")}>
      <AlertTriangle size={18} />
      <div>
        <strong>Phase division · Check access after 10 PM</strong>
        <p>{PHASE_NOTICE}</p>
      </div>
    </aside>
  );
}
