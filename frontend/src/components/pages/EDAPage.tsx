import React, { useState } from "react"
import { TrendingUp, BarChart3, PieChart, Zap, Database, AlertCircle, Target } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { Alert, AlertDescription } from "../ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { DataVisualization } from "../DataVisualization"
import { DataTable } from "../DataTable"
import { edaProfileFromParsed } from "../../lib/api"

interface EDAPageProps {
  uploadedData: any
  setAnalysisResults: React.Dispatch<React.SetStateAction<any[]>>
  analysisResults: any[]
}

export function EDAPage({ uploadedData, setAnalysisResults, analysisResults }: EDAPageProps) {
  const [activeAnalysis, setActiveAnalysis] = useState("overview")
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const runEDAAnalysis = async (type: string) => {
    if (!uploadedData) return

    setIsAnalyzing(true)
    try {
      if (type === "basic_stats" || type === "pca" || type === "correlation") {
        const resp = await edaProfileFromParsed(uploadedData, 800);
        const summary = JSON.stringify(resp.shape || resp, null, 2);
        const analysisResult = {
          type: "eda",
          subType: type,
          content: `EDA 프로파일 요약:\n${summary}`,
          timestamp: new Date(),
        };
        setAnalysisResults(prev => [...prev, analysisResult])
      } else {
        // 기타 항목은 기존 시뮬레이션 텍스트
        const analysisResult = {
          type: "eda",
          subType: type,
          content: getAnalysisContent(type),
          timestamp: new Date(),
        };
        setAnalysisResults(prev => [...prev, analysisResult])
      }
    } finally {
      setIsAnalyzing(false)
    }
  }

  const getAnalysisContent = (type: string) => {
    switch (type) {
      case "basic_stats":
        return "기본 통계 분석 완료:\n• 평균 나이: 29세\n• 평균 급여: 4,860만원\n• 결측값: 0개\n• 이상치: 2개 발견"
      case "correlation":
        return "상관관계 분석 완료:\n• 나이-급여 상관계수: 0.73\n• 경력-급여 상관계수: 0.84\n• 부서별 급여 차이: 유의미함"
      case "outliers":
        return "이상치 탐지 완료:\n• Z-score 방법: 3개 이상치\n• IQR 방법: 2개 이상치\n• 검토 필요한 데이터 포인트 확인됨"
      case "pca":
        return "주성분 분석 완료:\n• 첫 번째 주성분: 전체 분산의 68% 설명\n• 두 번째 주성분: 추가 22% 설명\n• 차원 축소 효과 확인"
      default:
        return "분석이 완료되었습니다."
    }
  }

  if (!uploadedData) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">탐색적 데이터 분석 (EDA)</h2>
          <p className="text-muted-foreground">데이터의 패턴과 인사이트를 발견하세요</p>
        </div>
        
        <Alert>
          <Database className="h-4 w-4" />
          <AlertDescription>
            EDA를 시작하려면 먼저 Chat & Upload 탭에서 CSV 데이터를 업로드해주세요.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const edaCards = [
    {
      title: "기본 통계",
      description: "기초 통계량과 데이터 품질 분석",
      icon: TrendingUp,
      action: "basic_stats",
      color: "from-blue-500 to-cyan-600"
    },
    {
      title: "상관관계 분석",
      description: "변수 간 상관관계와 의존성 분석",
      icon: BarChart3,
      action: "correlation",
      color: "from-green-500 to-emerald-600"
    },
    {
      title: "이상치 탐지",
      description: "통계적 방법으로 이상치 식별",
      icon: AlertCircle,
      action: "outliers",
      color: "from-red-500 to-pink-600"
    },
    {
      title: "차원 축소 (PCA)",
      description: "주성분 분석을 통한 차원 축소",
      icon: Target,
      action: "pca",
      color: "from-purple-500 to-indigo-600"
    }
  ]

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">탐색적 데이터 분석 (EDA)</h2>
          <p className="text-muted-foreground">데이터의 숨겨진 패턴과 인사이트를 발견하세요</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-2">
            <Database className="h-3 w-3" />
            {uploadedData.totalRows || uploadedData.rows?.length || 0}개 행
          </Badge>
          <Badge variant="secondary" className="gap-2">
            <BarChart3 className="h-3 w-3" />
            {uploadedData.headers?.length || 0}개 열
          </Badge>
        </div>
      </div>

      {/* 빠른 분석 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {edaCards.map((card) => {
          const Icon: any = card.icon
          return (
            <Card key={card.action} className="group hover:shadow-lg transition-all duration-300 cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-gradient-to-r ${card.color} text-white group-hover:scale-110 transition-transform`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{card.title}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground mb-4">{card.description}</p>
                <Button 
                  onClick={() => runEDAAnalysis(card.action)}
                  disabled={isAnalyzing}
                  className="w-full gap-2"
                  size="sm"
                >
                  {isAnalyzing ? (
                    <Zap className="h-4 w-4 animate-pulse" />
                  ) : (
                    <Zap className="h-4 w-4" />
                  )}
                  분석 실행
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* 메인 분석 영역 */}
      <Tabs value={activeAnalysis} onValueChange={setActiveAnalysis} className="w-full">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="visualization">시각화</TabsTrigger>
          <TabsTrigger value="table">데이터 뷰</TabsTrigger>
          <TabsTrigger value="insights">인사이트</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* KPI 카드 */}
            <Card>
              <CardHeader>
                <CardTitle>데이터 품질</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">완성도</span>
                    <span className="font-medium">100%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">결측값</span>
                    <span className="font-medium text-green-600">0개</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">중복값</span>
                    <span className="font-medium">0개</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">데이터 타입</span>
                    <Badge variant="secondary">혼합</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 수치 요약 */}
            <Card>
              <CardHeader>
                <CardTitle>수치형 데이터</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">평균 나이</span>
                    <span className="font-medium">29.4세</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">평균 급여</span>
                    <span className="font-medium">4,860만원</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">급여 편차</span>
                    <span className="font-medium">±820만원</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">분포</span>
                    <Badge variant="secondary">정규분포</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 범주형 요약 */}
            <Card>
              <CardHeader>
                <CardTitle>범주형 데이터</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">부서 수</span>
                    <span className="font-medium">3개</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">최다 부서</span>
                    <span className="font-medium">IT (40%)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">직업 종류</span>
                    <span className="font-medium">5개</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">분포</span>
                    <Badge variant="secondary">균등함</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="visualization" className="mt-6">
          <DataVisualization data={uploadedData} />
        </TabsContent>

        <TabsContent value="table" className="mt-6">
          <DataTable data={uploadedData} />
        </TabsContent>

        <TabsContent value="insights" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>핵심 발견사항</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg dark:bg-blue-950/30">
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">급여 분석</h4>
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      IT 부서의 평균 급여가 다른 부서보다 15% 높으며, 경력과 강한 양의 상관관계를 보입니다.
                    </p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg dark:bg-green-950/30">
                    <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">연령 분포</h4>
                    <p className="text-sm text-green-800 dark:text-green-200">
                      직원 연령이 26-32세에 집중되어 있어, 조직이 상대적으로 젊은 구성을 가지고 있습니다.
                    </p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg dark:bg-purple-950/30">
                    <h4 className="font-medium text-purple-900 dark:text-purple-100 mb-2">부서별 특성</h4>
                    <p className="text-sm text-purple-800 dark:text-purple-200">
                      각 부서별로 뚜렷한 급여 및 연령 특성을 보이며, 채용 패턴의 차이가 관찰됩니다.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>추천 분석</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-2"
                    onClick={() => runEDAAnalysis("correlation")}
                  >
                    <BarChart3 className="h-4 w-4" />
                    상관관계 매트릭스 생성
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-2"
                    onClick={() => runEDAAnalysis("outliers")}
                  >
                    <AlertCircle className="h-4 w-4" />
                    이상치 상세 분석
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-2"
                    onClick={() => runEDAAnalysis("pca")}
                  >
                    <Target className="h-4 w-4" />
                    차원 축소 분석
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
