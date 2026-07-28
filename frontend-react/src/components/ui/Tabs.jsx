import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";

// Thin styled wrapper over Headless UI's TabGroup — for AddSnippet's
// Manual/AI/Bulk-Import three-tab UI (Phase 2). `tabs`: string[] of labels;
// panels are passed as children in the same order via <TabPanel>.
export function Tabs({ tabs, selectedIndex, onChange, children }) {
  return (
    <TabGroup selectedIndex={selectedIndex} onChange={onChange}>
      <TabList className="flex gap-1 rounded-lg border border-border-card bg-card-elevated p-1">
        {tabs.map((label) => (
          <Tab
            key={label}
            className="flex-1 rounded-md px-3 py-2 text-sm font-semibold text-text-secondary outline-none transition-colors data-[hover]:text-text data-[selected]:bg-primary data-[selected]:text-[#03080e]"
          >
            {label}
          </Tab>
        ))}
      </TabList>
      <TabPanels className="mt-4">{children}</TabPanels>
    </TabGroup>
  );
}

export { TabPanel };
