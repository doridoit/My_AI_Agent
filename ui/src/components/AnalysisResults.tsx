import { useState } from "react"
import { FileText, Download, Trash2, Clock, TrendingUp, BarChart, PieChart } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { Alert, AlertDescription } from "./ui/alert"
import { ScrollArea } from "./ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"

interface AnalysisResult {
  type: string
  content: string
  timestamp: Date
}

interface AnalysisResultsProps {
  results: AnalysisResult[]
}

export function AnalysisResults({ results }: AnalysisResultsProps) {
  const [selectedResult, setSelectedResult] = useState<AnalysisResult | null>(null)

  if (results.length === 0) {
    return (
      <Alert>
        <AlertDescription>
          아직 분석 결과가 없습니다. AI 채팅에서 데이터 분석을 요청해보세요.
        </AlertDescription>
      </Alert>
    )
  }

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'summary':
        return <FileText className="h-4 w-4" />
      case 'statistics':
        return <TrendingUp className="h-4 w-4" />
      case 'correlation':
        return <BarChart className="h-4 w-4" />
      case 'visualization':
        return <PieChart className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const getResultTypeLabel = (type: string) => {
    switch (type) {
      case 'summary':
        return '데이터 요약'
      case 'statistics':
        return '기본 통계'
      case 'correlation':
        return '상관관계 분석'
      case 'visualization':
        return '시각화'
      case 'prediction':
        return '예측 분석'
      default:
        return '일반 분석'
    }
  }

  const getResultTypeColor = (type: string) => {
    switch (type) {
      case 'summary':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'statistics':
        return 'bg-green-50 text-green-700 border-green-200'
      case 'correlation':
        return 'bg-purple-50 text-purple-700 border-purple-200'
      case 'visualization':
        return 'bg-orange-50 text-orange-700 border-orange-200'
      case 'prediction':
        return 'bg-red-50 text-red-700 border-red-200'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const exportResults = () => {
    const dataStr = JSON.stringify(results, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    
    const exportFileDefaultName = `analysis_results_${new Date().toISOString().split('T')[0]}.json`
    
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  const clearResults = () => {
    // 실제 구현에서는 상위 컴포넌트의 상태를 업데이트해야 합니다
    console.log('결과 초기화')
  }

  // 결과를 시간순으로 정렬
  const sortedResults = [...results].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )

  // 결과 타입별로 그룹화
  const groupedResults = results.reduce((acc: any, result) => {
    if (!acc[result.type]) {
      acc[result.type] = []
    }
    acc[result.type].push(result)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3>분석 결과</h3>
          <Badge variant="secondary">{results.length}개 결과</Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportResults}>
            <Download className="h-4 w-4 mr-1" />
            내보내기
          </Button>
          <Button variant="outline" size="sm" onClick={clearResults}>
            <Trash2 className="h-4 w-4 mr-1" />
            초기화
          </Button>
        </div>
      </div>

      <Tabs defaultValue="timeline" className="w-full">
        <TabsList>
          <TabsTrigger value="timeline">시간순</TabsTrigger>
          <TabsTrigger value="category">카테고리별</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="mt-4">
          <div className="space-y-3">
            {sortedResults.map((result, index) => (
              <Card 
                key={index} 
                className={`cursor-pointer transition-colors hover:bg-accent/50 ${
                  selectedResult === result ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setSelectedResult(selectedResult === result ? null : result)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getResultIcon(result.type)}
                      <CardTitle className="text-base">
                        {getResultTypeLabel(result.type)}
                      </CardTitle>
                      <Badge 
                        variant="outline" 
                        className={getResultTypeColor(result.type)}
                      >
                        {result.type}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(result.timestamp).toLocaleString('ko-KR')}
                    </div>
                  </div>
                </CardHeader>
                
                {selectedResult === result && (
                  <CardContent className="pt-0">
                    <ScrollArea className="max-h-40">
                      <div className={`p-3 rounded-lg ${getResultTypeColor(result.type)}`}>
                        <pre className="whitespace-pre-wrap text-sm">
                          {result.content}
                        </pre>
                      </div>
                    </ScrollArea>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="category" className="mt-4">
          <div className="space-y-4">
            {Object.entries(groupedResults).map(([type, typeResults]: [string, any]) => (
              <Card key={type}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {getResultIcon(type)}
                    {getResultTypeLabel(type)}
                    <Badge variant="secondary">{typeResults.length}개</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {typeResults.map((result: AnalysisResult, index: number) => (
                      <div 
                        key={index}
                        className={`p-3 rounded-lg cursor-pointer transition-colors hover:bg-accent/50 ${getResultTypeColor(type)}`}
                        onClick={() => setSelectedResult(selectedResult === result ? null : result)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">
                            분석 #{index + 1}
                          </span>
                          <span className="text-xs opacity-75">
                            {new Date(result.timestamp).toLocaleTimeString('ko-KR')}
                          </span>
                        </div>
                        
                        {selectedResult === result ? (
                          <pre className="text-sm whitespace-pre-wrap">
                            {result.content}
                          </pre>
                        ) : (
                          <p className="text-sm opacity-75 truncate">
                            {result.content.substring(0, 100)}...
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* 통계 요약 */}
      <Card>
        <CardHeader>
          <CardTitle>분석 통계</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {results.filter(r => r.type === 'summary').length}
              </div>
              <div className="text-sm text-muted-foreground">요약 분석</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {results.filter(r => r.type === 'statistics').length}
              </div>
              <div className="text-sm text-muted-foreground">통계 분석</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {results.filter(r => r.type === 'correlation').length}
              </div>
              <div className="text-sm text-muted-foreground">상관관계</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {results.filter(r => r.type === 'visualization').length}
              </div>
              <div className="text-sm text-muted-foreground">시각화</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}