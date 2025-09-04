import React, { useState } from "react"
import { AlertTriangle, Zap, Target, BarChart3, TrendingUp, Database, Settings } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { Alert, AlertDescription } from "../ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Slider } from "../ui/slider"
import { Progress } from "../ui/progress"

interface AnomalyPageProps {
  uploadedData: any
  setAnalysisResults: React.Dispatch<React.SetStateAction<any[]>>
  analysisResults: any[]
}

export function AnomalyPage({ uploadedData, setAnalysisResults, analysisResults }: AnomalyPageProps) {
  const [selectedMethod, setSelectedMethod] = useState("zscore")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [detectedAnomalies, setDetectedAnomalies] = useState<any[]>([])
  const [threshold, setThreshold] = useState([2.5])

  const anomalyMethods = [
    {
      id: "zscore",
      name: "Z-Score",
      description: "통계적 표준편차 기반 이상치 탐지",
      icon: TrendingUp,
      color: "from-blue-500 to-cyan-600"
    },
    {
      id: "iqr", 
      name: "IQR",
      description: "사분위수 범위 기반 이상치 탐지",
      icon: BarChart3,
      color: "from-green-500 to-emerald-600"
    },
    {
      id: "isolation_forest",
      name: "Isolation Forest",
      description: "머신러닝 기반 이상치 탐지",
      icon: Target,
      color: "from-purple-500 to-indigo-600"
    },
    {
      id: "local_outlier",
      name: "Local Outlier Factor",
      description: "지역 밀도 기반 이상치 탐지",
      icon: AlertTriangle,
      color: "from-red-500 to-pink-600"
    }
  ]

  const runAnomalyDetection = async () => {
    if (!uploadedData) return

    setIsAnalyzing(true)
    setAnalysisProgress(0)
    setDetectedAnomalies([])

    // 분석 진행 시뮬레이션
    const steps = [10, 25, 50, 75, 90, 100]
    for (let step of steps) {
      await new Promise(resolve => setTimeout(resolve, 500))
      setAnalysisProgress(step)
    }

    // 모의 이상치 데이터 생성
    const mockAnomalies = generateMockAnomalies(selectedMethod)
    setDetectedAnomalies(mockAnomalies)

    // 분석 결과 저장
    setAnalysisResults(prev => [...prev, {
      type: "anomaly",
      subType: selectedMethod,
      content: `${selectedMethod} 방법으로 ${mockAnomalies.length}개의 이상치를 탐지했습니다.`,
      timestamp: new Date()
    }])

    setIsAnalyzing(false)
  }

  const generateMockAnomalies = (method: string) => {
    const baseAnomalies = [
      {
        id: 1,
        record: { 이름: "이상값1", 나이: 45, 급여: 9500, 부서: "IT" },
        score: 3.2,
        reason: "급여가 평균보다 매우 높음",
        severity: "high"
      },
      {
        id: 2,
        record: { 이름: "이상값2", 나이: 22, 급여: 2000, 부서: "경영" },
        score: 2.8,
        reason: "급여가 평균보다 매우 낮음",
        severity: "medium"
      },
      {
        id: 3,
        record: { 이름: "이상값3", 나이: 55, 급여: 7000, 부서: "마케팅" },
        score: 2.6,
        reason: "나이가 일반적인 범위를 벗어남",
        severity: "medium"
      }
    ]

    // 방법에 따라 다른 스코어 계산
    return baseAnomalies.map(anomaly => ({
      ...anomaly,
      method,
      score: method === 'zscore' ? anomaly.score : 
             method === 'iqr' ? anomaly.score * 0.8 :
             method === 'isolation_forest' ? Math.random() * 0.3 + 0.1 :
             anomaly.score * 1.1
    }))
  }

  if (!uploadedData) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">이상 탐지 (Anomaly Detection)</h2>
          <p className="text-muted-foreground">데이터의 이상치를 탐지하고 분석하세요</p>
        </div>
        
        <Alert>
          <Database className="h-4 w-4" />
          <AlertDescription>
            이상 탐지를 시작하려면 먼저 Chat & Upload 탭에서 CSV 데이터를 업로드해주세요.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const selectedMethodInfo = anomalyMethods.find(m => m.id === selectedMethod)

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">이상 탐지 (Anomaly Detection)</h2>
          <p className="text-muted-foreground">다양한 알고리즘으로 데이터의 이상치를 탐지하세요</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-2">
            <Database className="h-3 w-3" />
            {uploadedData.totalRows || uploadedData.rows?.length || 0}개 행
          </Badge>
          {detectedAnomalies.length > 0 && (
            <Badge variant="destructive" className="gap-2">
              <AlertTriangle className="h-3 w-3" />
              {detectedAnomalies.length}개 이상치
            </Badge>
          )}
        </div>
      </div>

      {/* 방법 선택 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {anomalyMethods.map((method) => (
          <Card 
            key={method.id} 
            className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
              selectedMethod === method.id ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => setSelectedMethod(method.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-gradient-to-r ${method.color} text-white`}>
                  <method.icon className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base">{method.name}</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground">{method.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 설정 및 실행 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              분석 설정
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">탐지 방법</label>
              <Select value={selectedMethod} onValueChange={setSelectedMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {anomalyMethods.map((method) => (
                    <SelectItem key={method.id} value={method.id}>
                      {method.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedMethod === 'zscore' && (
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Z-Score 임계값: {threshold[0]}
                </label>
                <Slider
                  value={threshold}
                  onValueChange={setThreshold}
                  max={5}
                  min={1}
                  step={0.1}
                  className="w-full"
                />
              </div>
            )}

            <div className="p-3 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-2">{selectedMethodInfo?.name}</h4>
              <p className="text-sm text-muted-foreground">
                {selectedMethodInfo?.description}
              </p>
            </div>

            <Button 
              onClick={runAnomalyDetection}
              disabled={isAnalyzing}
              className="w-full gap-2"
            >
              {isAnalyzing ? (
                <Zap className="h-4 w-4 animate-pulse" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              {isAnalyzing ? '분석 중...' : '이상치 탐지 실행'}
            </Button>

            {isAnalyzing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>진행률</span>
                  <span>{analysisProgress}%</span>
                </div>
                <Progress value={analysisProgress} className="w-full" />
              </div>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <Tabs defaultValue="results" className="w-full">
            <TabsList>
              <TabsTrigger value="results">탐지 결과</TabsTrigger>
              <TabsTrigger value="visualization">시각화</TabsTrigger>
              <TabsTrigger value="analysis">분석 리포트</TabsTrigger>
            </TabsList>

            <TabsContent value="results" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>탐지된 이상치</CardTitle>
                </CardHeader>
                <CardContent>
                  {detectedAnomalies.length > 0 ? (
                    <div className="space-y-3">
                      {detectedAnomalies.map((anomaly) => (
                        <div key={anomaly.id} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant={
                                  anomaly.severity === 'high' ? 'destructive' :
                                  anomaly.severity === 'medium' ? 'default' : 'secondary'
                                }
                              >
                                {anomaly.severity === 'high' ? '높음' :
                                 anomaly.severity === 'medium' ? '중간' : '낮음'}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                스코어: {anomaly.score.toFixed(2)}
                              </span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3 text-sm">
                            {Object.entries(anomaly.record).map(([key, value]) => (
                              <div key={key}>
                                <span className="text-muted-foreground">{key}:</span>
                                <span className="ml-1 font-medium">{value}</span>
                              </div>
                            ))}
                          </div>
                          
                          <div className="p-2 bg-muted/50 rounded text-sm">
                            <strong>이상 원인:</strong> {anomaly.reason}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>아직 이상치 탐지를 실행하지 않았습니다.</p>
                      <p className="text-sm">왼쪽에서 방법을 선택하고 분석을 시작하세요.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="visualization" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>이상치 시각화</CardTitle>
                </CardHeader>
                <CardContent>
                  {detectedAnomalies.length > 0 ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 rounded-lg dark:bg-blue-950/30">
                        <h4 className="font-medium mb-2">분포 차트</h4>
                        <p className="text-sm text-muted-foreground">
                          이상치들이 전체 데이터 분포에서 어떤 위치에 있는지 시각화됩니다.
                        </p>
                        <div className="mt-4 h-40 bg-white rounded border flex items-center justify-center text-muted-foreground">
                          [산점도 차트 영역]
                        </div>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg dark:bg-green-950/30">
                        <h4 className="font-medium mb-2">히트맵</h4>
                        <p className="text-sm text-muted-foreground">
                          각 특성별 이상 정도를 색상으로 표현합니다.
                        </p>
                        <div className="mt-4 h-32 bg-white rounded border flex items-center justify-center text-muted-foreground">
                          [히트맵 영역]
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>이상치 탐지 후 시각화가 표시됩니다.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analysis" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>분석 리포트</CardTitle>
                </CardHeader>
                <CardContent>
                  {detectedAnomalies.length > 0 ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-3 bg-red-50 rounded-lg dark:bg-red-950/30">
                          <div className="text-2xl font-bold text-red-600">
                            {detectedAnomalies.filter(a => a.severity === 'high').length}
                          </div>
                          <div className="text-sm text-muted-foreground">높은 위험</div>
                        </div>
                        <div className="text-center p-3 bg-yellow-50 rounded-lg dark:bg-yellow-950/30">
                          <div className="text-2xl font-bold text-yellow-600">
                            {detectedAnomalies.filter(a => a.severity === 'medium').length}
                          </div>
                          <div className="text-sm text-muted-foreground">중간 위험</div>
                        </div>
                        <div className="text-center p-3 bg-blue-50 rounded-lg dark:bg-blue-950/30">
                          <div className="text-2xl font-bold text-blue-600">
                            {(detectedAnomalies.length / (uploadedData.totalRows || uploadedData.rows?.length || 1) * 100).toFixed(1)}%
                          </div>
                          <div className="text-sm text-muted-foreground">이상치 비율</div>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg dark:bg-green-950/30">
                          <div className="text-2xl font-bold text-green-600">
                            {selectedMethodInfo?.name}
                          </div>
                          <div className="text-sm text-muted-foreground">사용된 방법</div>
                        </div>
                      </div>

                      <div className="prose prose-sm max-w-none">
                        <h4>분석 요약</h4>
                        <p>
                          {selectedMethodInfo?.name} 방법을 사용하여 총 {detectedAnomalies.length}개의 이상치를 탐지했습니다.
                          전체 데이터의 {(detectedAnomalies.length / (uploadedData.totalRows || uploadedData.rows?.length || 1) * 100).toFixed(1)}%에 해당합니다.
                        </p>
                        <h4>권장 조치</h4>
                        <ul>
                          <li>높은 위험도 이상치는 즉시 검토가 필요합니다</li>
                          <li>중간 위험도 이상치는 추가 분석을 고려하세요</li>
                          <li>도메인 전문가와 함께 이상치의 비즈니스적 의미를 확인하세요</li>
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>분석 완료 후 상세 리포트가 표시됩니다.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}