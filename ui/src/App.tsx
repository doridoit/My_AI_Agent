import { useState } from "react"
import { SidebarProvider, SidebarInset } from "./components/ui/sidebar"
import { AppSidebar } from "./components/AppSidebar"
import { ChatUploadPage } from "./components/pages/ChatUploadPage"
import { EDAPage } from "./components/pages/EDAPage"
import { RAGPage } from "./components/pages/RAGPage"
import { AnomalyPage } from "./components/pages/AnomalyPage"
import { SettingsPage } from "./components/pages/SettingsPage"
import { HeaderBar } from "./components/HeaderBar"

export default function App() {
  const [activeTab, setActiveTab] = useState("chat")
  const [uploadedData, setUploadedData] = useState(null)
  const [pdfDocuments, setPdfDocuments] = useState([])
  const [analysisResults, setAnalysisResults] = useState([])
  const [mcpStatus, setMcpStatus] = useState({
    core: 'disconnected',
    dataTools: 'disconnected'
  })

  const appState = {
    uploadedData,
    setUploadedData,
    pdfDocuments,
    setPdfDocuments,
    analysisResults,
    setAnalysisResults,
    mcpStatus,
    setMcpStatus
  }

  const renderActiveTab = () => {
    switch (activeTab) {
      case "chat":
        return <ChatUploadPage {...appState} />
      case "eda":
        return <EDAPage {...appState} />
      case "rag":
        return <RAGPage {...appState} />
      case "anomaly":
        return <AnomalyPage {...appState} />
      case "settings":
        return <SettingsPage {...appState} />
      default:
        return <ChatUploadPage {...appState} />
    }
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-background to-muted/20">
        <AppSidebar 
          activeTab={activeTab} 
          onTabChange={setActiveTab}
          appState={appState}
        />
        <SidebarInset className="flex-1">
          <HeaderBar 
            activeTab={activeTab}
            appState={appState}
          />
          
          <main className="flex-1 p-6 space-y-6">
            {renderActiveTab()}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}