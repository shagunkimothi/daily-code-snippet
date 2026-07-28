import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Radio, RadioGroup } from "@headlessui/react";
import { Check } from "lucide-react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import TagChip from "../components/TagChip/TagChip";
import * as userService from "../services/userService";

const REMINDER_OPTIONS = [
  { value: "none", label: "No reminders", description: "I'll check in on my own." },
  { value: "daily_morning", label: "Every morning", description: "Start the day with today's concept." },
  { value: "daily_afternoon", label: "Every afternoon", description: "A midday nudge to keep the streak going." },
  { value: "daily_evening", label: "Every evening", description: "Wind down with something new to learn." },
  { value: "weekly_summary", label: "Weekly summary", description: "One email a week, no daily noise." },
];

// Two-step wizard shown once, right after a user's first real login
// following signup (see AuthContext's redirectAfterAuth) — gated by
// `onboarding_completed`, so it never shows again once finished or
// skipped. Both steps are skippable: onboarding should lower friction
// into the product, not gate it behind a mandatory form.
export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [topics, setTopics] = useState([]);
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [frequency, setFrequency] = useState("none");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    userService.getTopics().then(setTopics).catch(() => setTopics([]));
  }, []);

  function toggleTopic(id) {
    setSelectedTopics((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  }

  async function finish() {
    setBusy(true);
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    try {
      await Promise.all([
        selectedTopics.length > 0 ? userService.updateMyTopics(selectedTopics) : Promise.resolve(),
        userService.updateMyReminders({ frequency, timezone }),
      ]);
      await userService.completeOnboarding();
    } catch {
      // Best-effort — a save failing here shouldn't lock someone out of
      // the app they just logged into; they can redo this in Settings.
    } finally {
      setBusy(false);
      navigate("/", { replace: true });
    }
  }

  async function skipAll() {
    setBusy(true);
    try {
      await userService.completeOnboarding();
    } catch {
      /* ignore — still let them in */
    } finally {
      setBusy(false);
      navigate("/", { replace: true });
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-6 text-center">
          <p className="mb-1 font-mono text-xs font-bold uppercase tracking-widest text-primary">Step {step} of 2</p>
          <h1 className="font-mono text-xl font-extrabold text-text sm:text-2xl">
            {step === 1 ? "What would you like to learn?" : "Want a nudge to keep learning?"}
          </h1>
        </div>

        <Card padding="lg">
          {step === 1 ? (
            <>
              <p className="mb-4 text-sm text-muted">Pick as many as you like — this shapes what gets recommended to you.</p>
              <div className="flex flex-wrap gap-2">
                {topics.map((t) => (
                  <TagChip
                    key={t.id}
                    label={t.name}
                    active={selectedTopics.includes(t.id)}
                    onClick={() => toggleTopic(t.id)}
                  />
                ))}
              </div>
              <div className="mt-7 flex items-center justify-between">
                <button type="button" onClick={skipAll} className="text-sm text-muted hover:text-text-secondary">
                  Skip for now
                </button>
                <Button variant="primary" onClick={() => setStep(2)}>
                  Continue
                </Button>
              </div>
            </>
          ) : (
            <>
              <RadioGroup value={frequency} onChange={setFrequency} className="flex flex-col gap-2">
                {REMINDER_OPTIONS.map((opt) => (
                  <Radio
                    key={opt.value}
                    value={opt.value}
                    className="group cursor-pointer rounded-lg border border-border-card bg-card-elevated px-4 py-3 transition-colors hover:border-border-hover data-[checked]:border-primary data-[checked]:bg-primary-subtle"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-text group-data-[checked]:text-primary">{opt.label}</p>
                        <p className="text-xs text-muted">{opt.description}</p>
                      </div>
                      <Check
                        size={16}
                        className="invisible flex-shrink-0 text-primary group-data-[checked]:visible"
                        aria-hidden="true"
                      />
                    </div>
                  </Radio>
                ))}
              </RadioGroup>
              <div className="mt-7 flex items-center justify-between">
                <button type="button" onClick={() => setStep(1)} className="text-sm text-muted hover:text-text-secondary">
                  Back
                </button>
                <Button variant="primary" loading={busy} onClick={finish}>
                  Finish
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
