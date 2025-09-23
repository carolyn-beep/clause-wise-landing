import { Routes, Route } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import Upload from "./app/Upload";
import History from "./app/History";
import Account from "./app/Account";
import Report from "./app/Report";

const App = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Upload />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/history" element={<History />} />
            <Route path="/account" element={<Account />} />
            <Route path="/report/:analysisId" element={<Report />} />
          </Routes>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default App;