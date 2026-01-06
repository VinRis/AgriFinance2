'use client';
import AppLayout from "./(app)/layout";
import LivestockSelectionPage from "./(app)/home/page";

// This is the main entry point for the app.
// It will render the AppLayout which handles auth and loading states.
// Inside the AppLayout, the default page is the LivestockSelectionPage.
export default function HomePage() {
  return (
    <AppLayout>
      <LivestockSelectionPage />
    </AppLayout>
  )
}
