import { useState } from "react";
import Ticker from "@/components/Ticker";
import LeftPanel from "@/components/LeftPanel";
import ReportPanel from "@/components/ReportPanel";

const Index = () => {
  const [isSearching, setIsSearching] = useState(false);

  const handleRunReport = () => {
    setIsSearching(true);
    setTimeout(() => setIsSearching(false), 3000);
  };

  return (
    <div className="h-screen overflow-hidden relative z-[1]">
      <Ticker />
      <div
        className="grid h-[calc(100vh-26px)] mt-[26px] relative z-[1]"
        style={{ gridTemplateColumns: "380px 1fr" }}
      >
        <LeftPanel onRunReport={handleRunReport} isSearching={isSearching} />
        <ReportPanel />
      </div>
    </div>
  );
};

export default Index;
