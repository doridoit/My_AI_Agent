import React from "react"
import { 
  MessageSquare, 
  BarChart3, 
  Search, 
  AlertTriangle, 
  Settings, 
  Brain,
  FileText,
  Database,
  Zap,
  TrendingUp,
  Shield
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "./ui/sidebar"
import { Badge } from "./ui/badge"
import { Progress } from "./ui/progress"

const primaryItems = [
  {
    title: "Chat & Upload",
    description: "데이터와 AI 대화",
    icon: MessageSquare,
    value: "chat",
    gradient: "from-blue-500 to-purple-600"
  },
  {
    title: "탐색적 데이터 분석",
    description: "EDA & 통계 분석",
    icon: BarChart3,
    value: "eda",
    gradient: "from-green-500 to-emerald-600"
  },
  {
    title: "RAG 검색",
    description: "문서 기반 검색",
    icon: Search,
    value: "rag",
    gradient: "from-orange-500 to-red-600"
  },
  {
    title: "이상 탐지",
    description: "Anomaly Detection",
    icon: AlertTriangle,
    value: "anomaly",
    gradient: "from-red-500 to-pink-600"
  }
]

const secondaryItems = [
  {
    title: "설정",
    description: "API 키 & 환경설정",
    icon: Settings,
    value: "settings"
  }
]

interface AppSidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
  appState: any
}

export function AppSidebar({ activeTab, onTabChange, appState }: AppSidebarProps) {
  const { uploadedData, pdfDocuments, analysisResults } = appState

  return (
    <Sidebar className="border-r-0 bg-gradient-to-b from-sidebar via-sidebar to-sidebar/95">
      <SidebarContent className="p-4">
        {/* 브랜드 영역 */}
        <div className="flex items-center gap-3 mb-6 px-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
            <Brain className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sm">AI Agent</span>
            <span className="text-xs text-muted-foreground">v2.0</span>
          </div>
        </div>

        {/* 메인 네비게이션 */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
            🛠️ 분석 도구
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {primaryItems.map((item) => (
                <SidebarMenuItem key={item.value}>
                  <SidebarMenuButton 
                    onClick={() => onTabChange(item.value)}
                    isActive={activeTab === item.value}
                    className="relative group w-full justify-start h-12 rounded-xl hover:bg-sidebar-accent/50 transition-all duration-200"
                  >
                    <div className={`flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-r ${item.gradient} text-white group-hover:scale-110 transition-transform`}>
                      <item.icon className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col items-start ml-1">
                      <span className="text-sm font-medium">{item.title}</span>
                      <span className="text-xs text-muted-foreground">{item.description}</span>
                    </div>
                    {/* 상태 표시 */}
                    {item.value === "chat" && uploadedData && (
                      <Badge variant="secondary" className="ml-auto text-xs">
                        CSV
                      </Badge>
                    )}
                    {item.value === "rag" && pdfDocuments.length > 0 && (
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {pdfDocuments.length}
                      </Badge>
                    )}
                    {item.value === "eda" && analysisResults.length > 0 && (
                      <div className="ml-auto h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* 데이터 상태 패널 */}
        {(uploadedData || pdfDocuments.length > 0) && (
          <SidebarGroup className="mt-6">
            <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
              📊 데이터 상태
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="space-y-3 p-3 rounded-xl bg-sidebar-accent/30">
                {uploadedData && (
                  <div className="flex items-center gap-3">
                    <Database className="h-4 w-4 text-blue-500" />
                    <div className="flex-1">
                      <div className="text-sm font-medium">CSV 데이터</div>
                      <div className="text-xs text-muted-foreground">
                        {uploadedData.totalRows || uploadedData.rows?.length || 0}개 행
                      </div>
                    </div>
                  </div>
                )}
                
                {pdfDocuments.length > 0 && (
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-orange-500" />
                    <div className="flex-1">
                      <div className="text-sm font-medium">PDF 문서</div>
                      <div className="text-xs text-muted-foreground">
                        {pdfDocuments.length}개 파일
                      </div>
                    </div>
                  </div>
                )}

                {analysisResults.length > 0 && (
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <div className="flex-1">
                      <div className="text-sm font-medium">분석 결과</div>
                      <div className="text-xs text-muted-foreground">
                        {analysisResults.length}개 결과
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* 시스템 상태 */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
            ⚡ 시스템
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="space-y-2 p-3 rounded-xl bg-sidebar-accent/20">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">MCP Core</span>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span>Online</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Data Tools</span>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span>Ready</span>
                </div>
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* 설정 */}
        <SidebarGroup className="mt-4">
          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryItems.map((item) => (
                <SidebarMenuItem key={item.value}>
                  <SidebarMenuButton 
                    onClick={() => onTabChange(item.value)}
                    isActive={activeTab === item.value}
                    className="w-full justify-start h-10 rounded-lg hover:bg-sidebar-accent/50"
                  >
                    <item.icon className="h-4 w-4" />
                    <div className="flex flex-col items-start ml-1">
                      <span className="text-sm">{item.title}</span>
                      <span className="text-xs text-muted-foreground">{item.description}</span>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}