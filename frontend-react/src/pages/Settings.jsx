import { useEffect, useState } from "react";
import { Radio, RadioGroup } from "@headlessui/react";
import { Check, Palette } from "lucide-react";
import AppShell from "../components/Layout/AppShell";
import Header from "../components/Header/Header";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import TagChip from "../components/TagChip/TagChip";
import Toast from "../components/Toast/Toast";
import ThemeGallery from "../components/ThemeGallery/ThemeGallery";
import { useToast } from "../hooks/useToast";
import * as userService from "../services/userService";

const REMINDER_OPTIONS = [
  { value: "none", label: "No reminders", description: "I'll check in on my own." },
  { value: "daily_morning", label: "Every morning", description: "Start the day with today's concept." },
  { value: "daily_afternoon", label: "Every afternoon", description: "A midday nudge to keep the streak going." },
  { value: "daily_evening", label: "Every evening", description: "Wind down with something new to learn." },
  { value: "weekly_summary", label: "Weekly summary", description: "One email a week, no daily noise." },
];

// Hub for everything from Feature 6: Learning preferences + Reminders (the
// same data/components as onboarding — this is just "onboarding, editable
// anytime"), Appearance (opens the existing ThemeGallery rather than
// duplicating it), and Account/Security (password change — hidden for
// Google-only accounts via has_password, since it would otherwise always
// fail with a confusing error). "Notification preferences" isn't a
// separate section: email cadence *is* the notification preference right
// now — a future push/browser-notification channel would extend
// ReminderSettings, not replace this UI.
export default function Settings() {
  const { toast, showToast, dismissToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [hasPassword, setHasPassword] = useState(true);

  const [topics, setTopics] = useState([]);
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [frequency, setFrequency] = useState("none");
  const [savingPrefs, setSavingPrefs] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const [themeGalleryOpen, setThemeGalleryOpen] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [me, allTopics] = await Promise.all([userService.getMe(), userService.getTopics()]);
        setSelectedTopics(me.topics.map((t) => t.id));
        setFrequency(me.reminder_settings.frequency);
        setHasPassword(me.has_password);
        setTopics(allTopics);
      } catch {
        showToast("Could not load settings", "error");
      } finally {
        setLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleTopic(id) {
    setSelectedTopics((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  }

  async function savePreferences() {
    setSavingPrefs(true);
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    try {
      await Promise.all([
        userService.updateMyTopics(selectedTopics),
        userService.updateMyReminders({ frequency, timezone }),
      ]);
      showToast("Preferences saved");
    } catch (err) {
      showToast(err.message || "Could not save preferences", "error");
    } finally {
      setSavingPrefs(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    if (newPassword.length < 6) {
      showToast("New password must be at least 6 characters", "error");
      return;
    }
    setChangingPassword(true);
    try {
      await userService.changePassword({ currentPassword, newPassword });
      showToast("Password updated");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      showToast(err.message || "Could not update password", "error");
    } finally {
      setChangingPassword(false);
    }
  }

  return (
    <AppShell title="Settings" maxWidth="720px">
      <Header title="Settings" backTo="/" />

      {loading ? (
        <p className="text-sm text-muted">Loading...</p>
      ) : (
        <div className="flex flex-col gap-4">
          <Card padding="lg">
            <h2 className="mb-1 font-mono text-sm font-bold uppercase tracking-wide text-text-secondary">
              Learning Preferences
            </h2>
            <p className="mb-4 text-xs text-muted">What you'd like to learn — shapes what gets recommended to you.</p>
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
          </Card>

          <Card padding="lg">
            <h2 className="mb-1 font-mono text-sm font-bold uppercase tracking-wide text-text-secondary">Reminders</h2>
            <p className="mb-4 text-xs text-muted">Get an email nudge to keep your streak going.</p>
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
          </Card>

          <div className="flex justify-end">
            <Button variant="primary" loading={savingPrefs} onClick={savePreferences}>
              Save Preferences
            </Button>
          </div>

          <Card padding="lg">
            <h2 className="mb-1 font-mono text-sm font-bold uppercase tracking-wide text-text-secondary">Appearance</h2>
            <p className="mb-4 text-xs text-muted">Pick from 6 built-in themes.</p>
            <Button variant="secondary" onClick={() => setThemeGalleryOpen(true)} className="gap-1.5">
              <Palette size={15} aria-hidden="true" />
              Change theme
            </Button>
          </Card>

          {hasPassword && (
            <Card padding="lg">
              <h2 className="mb-1 font-mono text-sm font-bold uppercase tracking-wide text-text-secondary">
                Account &amp; Security
              </h2>
              <p className="mb-4 text-xs text-muted">Change your password.</p>
              <form onSubmit={handleChangePassword} className="flex flex-col gap-3 sm:max-w-sm">
                <Input
                  type="password"
                  label="Current password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
                <Input
                  type="password"
                  label="New password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <Button type="submit" variant="primary" loading={changingPassword} className="self-start">
                  Update Password
                </Button>
              </form>
            </Card>
          )}
        </div>
      )}

      <ThemeGallery open={themeGalleryOpen} onClose={() => setThemeGalleryOpen(false)} />
      <Toast toast={toast} onDismiss={dismissToast} />
    </AppShell>
  );
}
