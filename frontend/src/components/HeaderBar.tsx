import { SidebarTrigger } from "./ui/sidebar"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { 
  Brain, 
  Database, 
  Server, 
  Wifi, 
  WifiOff, 
  Bell,
  Settings,
  Moon,
  Sun
} from "lucide-react"
import React, { useState, useEffect } from "react"

const tabTitles = {
  chat: "Chat & Upload",
  eda: "탐색적 데이터 분석",
  rag: "RAG 검색",
  anomaly: "이상 탐지",
  settings: "설정"
}

const tabDescriptions = {
  chat: "데이터와 PDF를 업로드하고 AI와 대화하세요",
  eda: "데이터의 패턴과 인사이트를 발견하세요",
  rag: "문서에서 정보를 검색하고 질문하세요",
  anomaly: "데이터의 이상치를 탐지하고 분석하세요",
  settings: "애플리케이션 설정을 관리하세요"
}

interface HeaderBarProps {
  activeTab: string
  appState: any
}

export function HeaderBar({ activeTab, appState }: HeaderBarProps) {
  const [isDark, setIsDark] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const toggleTheme = () => {
    setIsDark(!isDark)
    document.documentElement.classList.toggle('dark')
  }

  const { uploadedData, pdfDocuments, mcpStatus } = appState

  return (
    <header className="sticky top-0 z-50 flex h-20 shrink-0 items-center gap-4 px-6 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <SidebarTrigger className="-ml-1" />
      
      {/* 로고와 제목 */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
          <Brain className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <h1 className="text-lg font-semibold leading-none">AI 데이터 분석 에이전트</h1>
          <p className="text-sm text-muted-foreground leading-none mt-1">
            {tabDescriptions[activeTab as keyof typeof tabDescriptions]}
          </p>
        </div>
      </div>

      {/* 현재 탭 표시 */}
      <div className="hidden md:flex items-center gap-2 ml-6">
        <div className="h-6 w-px bg-border" />
        <Badge variant="outline" className="gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          {tabTitles[activeTab as keyof typeof tabTitles]}
        </Badge>
      </div>

      <div className="flex items-center gap-4 ml-auto">
        {/* 상태 표시 */}
        <div className="hidden lg:flex items-center gap-3">
          {/* 데이터 상태 */}
          {uploadedData && (
            <Badge variant="secondary" className="gap-2">
              <Database className="h-3 w-3" />
              데이터 로드됨
            </Badge>
          )}
          
          {/* PDF 문서 상태 */}
          {pdfDocuments.length > 0 && (
            <Badge variant="secondary" className="gap-2">
              <Brain className="h-3 w-3" />
              PDF {pdfDocuments.length}개
            </Badge>
          )}

          {/* MCP 서버 상태 */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {mcpStatus.core === 'connected' ? (
                <Wifi className="h-3 w-3 text-green-500" />
              ) : (
                <WifiOff className="h-3 w-3 text-red-500" />
              )}
              <span className="text-xs text-muted-foreground">Core</span>
            </div>
            <div className="flex items-center gap-1">
              {mcpStatus.dataTools === 'connected' ? (
                <Server className="h-3 w-3 text-green-500" />
              ) : (
                <Server className="h-3 w-3 text-red-500" />
              )}
              <span className="text-xs text-muted-foreground">Tools</span>
            </div>
          </div>
        </div>

        {/* 시간 표시 */}
        <div className="hidden sm:flex flex-col items-end text-xs text-muted-foreground">
          <div>{currentTime.toLocaleDateString('ko-KR', { 
            month: 'short', 
            day: 'numeric',
            weekday: 'short'
          })}</div>
          <div className="font-mono">
            {currentTime.toLocaleTimeString('ko-KR', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </div>
        </div>

        {/* 액션 버튼들 */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Bell className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleTheme}>
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </header>
  )
}