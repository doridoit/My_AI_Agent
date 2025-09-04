import React, { useState } from "react"
import { Settings, Key, Database, Zap, Server, Brain, Shield, Monitor } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Badge } from "../ui/badge"
import { Alert, AlertDescription } from "../ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { Switch } from "../ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Separator } from "../ui/separator"

interface SettingsPageProps {
  mcpStatus: any
  setMcpStatus: (status: any) => void
}

export function SettingsPage({ mcpStatus, setMcpStatus }: SettingsPageProps) {
  const [apiKeys, setApiKeys] = useState({
    google: "",
    openai: ""
  })
  const [embeddingSettings, setEmbeddingSettings] = useState({
    provider: "google",
    model: "models/text-embedding-004"
  })
  const [mcpPorts, setMcpPorts] = useState({
    core: "8001",
    dataTools: "8002"
  })
  const [autoReindexing, setAutoReindexing] = useState(true)
  const [savedSettings, setSavedSettings] = useState(false)

  const saveSettings = () => {
    // 설정 저장 로직 시뮬레이션
    setSavedSettings(true)
    setTimeout(() => setSavedSettings(false), 3000)
  }

  const testConnection = async (service: string) => {
    // 연결 테스트 시뮬레이션
    if (service === 'mcp') {
      setMcpStatus({
        core: 'connected',
        dataTools: 'connected'
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h2 className="text-2xl font-bold">설정</h2>
        <p className="text-muted-foreground">API 키, 환경설정 및 시스템 옵션을 관리하세요</p>
      </div>

      <Tabs defaultValue="api" className="w-full">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="api" className="gap-2">
            <Key className="h-4 w-4" />
            API 키
          </TabsTrigger>
          <TabsTrigger value="embedding" className="gap-2">
            <Brain className="h-4 w-4" />
            임베딩
          </TabsTrigger>
          <TabsTrigger value="mcp" className="gap-2">
            <Server className="h-4 w-4" />
            MCP 서버
          </TabsTrigger>
          <TabsTrigger value="system" className="gap-2">
            <Monitor className="h-4 w-4" />
            시스템
          </TabsTrigger>
        </TabsList>

        <TabsContent value="api" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  API 키 관리
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    API 키는 로컬에서만 저장되며 외부로 전송되지 않습니다.
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Google API Key</label>
                    <Input
                      type="password"
                      placeholder="Google Gemini API 키를 입력하세요"
                      value={apiKeys.google}
                      onChange={(e) => setApiKeys(prev => ({ ...prev, google: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Gemini 모델과 임베딩을 위해 필요합니다
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">OpenAI API Key</label>
                    <Input
                      type="password"
                      placeholder="OpenAI API 키를 입력하세요"
                      value={apiKeys.openai}
                      onChange={(e) => setApiKeys(prev => ({ ...prev, openai: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      GPT 모델 사용을 위해 필요합니다 (선택사항)
                    </p>
                  </div>
                </div>

                <Button onClick={saveSettings} className="w-full">
                  {savedSettings ? "저장됨" : "API 키 저장"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>API 상태</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-sm">Google Gemini</span>
                    </div>
                    <Badge variant="secondary">활성</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-yellow-500" />
                      <span className="text-sm">OpenAI GPT</span>
                    </div>
                    <Badge variant="outline">선택적</Badge>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">사용 통계</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">오늘 요청:</span>
                        <span className="ml-1 font-medium">47회</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">이번 달:</span>
                        <span className="ml-1 font-medium">1,234회</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="embedding" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  임베딩 설정
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">임베딩 제공자</label>
                  <Select 
                    value={embeddingSettings.provider} 
                    onValueChange={(value) => setEmbeddingSettings(prev => ({ ...prev, provider: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="google">Google (Gemini)</SelectItem>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="huggingface">Hugging Face</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">임베딩 모델</label>
                  <Select 
                    value={embeddingSettings.model}
                    onValueChange={(value) => setEmbeddingSettings(prev => ({ ...prev, model: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {embeddingSettings.provider === 'google' && (
                        <>
                          <SelectItem value="models/text-embedding-004">text-embedding-004</SelectItem>
                          <SelectItem value="models/embedding-001">embedding-001</SelectItem>
                        </>
                      )}
                      {embeddingSettings.provider === 'openai' && (
                        <>
                          <SelectItem value="text-embedding-3-large">text-embedding-3-large</SelectItem>
                          <SelectItem value="text-embedding-3-small">text-embedding-3-small</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">자동 재인덱싱</label>
                    <p className="text-xs text-muted-foreground">
                      PDF나 설정 변경 시 자동으로 재인덱싱
                    </p>
                  </div>
                  <Switch 
                    checked={autoReindexing} 
                    onCheckedChange={setAutoReindexing}
                  />
                </div>

                <Button onClick={saveSettings} className="w-full">
                  임베딩 설정 저장
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>FAISS 벡터 저장소</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <h4 className="font-medium mb-2">저장소 정보</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">경로:</span>
                        <span className="font-mono">data/vector_store/</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">인덱스 크기:</span>
                        <span>2.4MB</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">벡터 수:</span>
                        <span>1,247개</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">차원:</span>
                        <span>768</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Button variant="outline" className="w-full">
                      인덱스 재구성
                    </Button>
                    <Button variant="outline" className="w-full">
                      캐시 초기화
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="mcp" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  MCP 서버 설정
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <Zap className="h-4 w-4" />
                  <AlertDescription>
                    MCP (Model Context Protocol) 서버는 AI 기능을 제공합니다.
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Core Server 포트</label>
                    <Input
                      placeholder="8001"
                      value={mcpPorts.core}
                      onChange={(e) => setMcpPorts(prev => ({ ...prev, core: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Data Tools 포트</label>
                    <Input
                      placeholder="8002"
                      value={mcpPorts.dataTools}
                      onChange={(e) => setMcpPorts(prev => ({ ...prev, dataTools: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Button onClick={() => testConnection('mcp')} className="w-full">
                    연결 테스트
                  </Button>
                  <Button variant="outline" className="w-full">
                    서버 재시작
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>서버 상태</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          mcpStatus.core === 'connected' ? 'bg-green-500' : 'bg-red-500'
                        }`} />
                        <div>
                          <p className="font-medium">Core Server</p>
                          <p className="text-sm text-muted-foreground">포트 {mcpPorts.core}</p>
                        </div>
                      </div>
                      <Badge variant={mcpStatus.core === 'connected' ? 'secondary' : 'destructive'}>
                        {mcpStatus.core === 'connected' ? '연결됨' : '연결 안됨'}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          mcpStatus.dataTools === 'connected' ? 'bg-green-500' : 'bg-red-500'
                        }`} />
                        <div>
                          <p className="font-medium">Data Tools</p>
                          <p className="text-sm text-muted-foreground">포트 {mcpPorts.dataTools}</p>
                        </div>
                      </div>
                      <Badge variant={mcpStatus.dataTools === 'connected' ? 'secondary' : 'destructive'}>
                        {mcpStatus.dataTools === 'connected' ? '연결됨' : '연결 안됨'}
                      </Badge>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">활용 가능한 도구</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Chat API</span>
                        <Badge variant="secondary">활성</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">EDA Tools</span>
                        <Badge variant="secondary">활성</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">RAG Search</span>
                        <Badge variant="secondary">활성</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="system" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  시스템 정보
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">애플리케이션:</span>
                      <span className="ml-1 font-medium">AI Agent v2.0</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">프레임워크:</span>
                      <span className="ml-1 font-medium">React + Tailwind</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">언어:</span>
                      <span className="ml-1 font-medium">TypeScript</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">빌드:</span>
                      <span className="ml-1 font-medium">2024.01.15</span>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">라이브러리 버전</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">LangChain</span>
                        <span>^0.1.0</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">FAISS</span>
                        <span>^1.7.4</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Recharts</span>
                        <span>^2.8.0</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Shadcn/ui</span>
                        <span>Latest</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>애플리케이션 설정</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium">다크 모드</label>
                      <p className="text-xs text-muted-foreground">테마 자동 전환</p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium">알림</label>
                      <p className="text-xs text-muted-foreground">분석 완료 알림</p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium">자동 저장</label>
                      <p className="text-xs text-muted-foreground">분석 결과 자동 저장</p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Button variant="outline" className="w-full">
                      설정 초기화
                    </Button>
                    <Button variant="outline" className="w-full">
                      캐시 지우기
                    </Button>
                    <Button variant="destructive" className="w-full">
                      모든 데이터 삭제
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}