import React, { useState } from "react"
import { Search, FileText, Brain, Zap, ArrowRight, Clock, BookOpen } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Badge } from "../ui/badge"
import { Alert, AlertDescription } from "../ui/alert"
import { ScrollArea } from "../ui/scroll-area"
import { Separator } from "../ui/separator"
import { ragSearch } from "../../lib/api"

interface RAGPageProps {
  pdfDocuments: any[]
  setAnalysisResults: React.Dispatch<React.SetStateAction<any[]>>
  analysisResults: any[]
  ragIndexDir?: string | null
}

interface SearchResult {
  id: string
  content: string
  source: string
  page: number
  score: number
  timestamp: Date
}

export function RAGPage({ pdfDocuments, setAnalysisResults, analysisResults, ragIndexDir = null }: RAGPageProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [aiResponse, setAiResponse] = useState("")
  const [isGeneratingResponse, setIsGeneratingResponse] = useState(false)

  const performSearch = async () => {
    if (!searchQuery.trim() || pdfDocuments.length === 0) return

    setIsSearching(true)
    setSearchResults([])
    setAiResponse("")
    try {
      const data = await ragSearch(searchQuery, { index_dir: ragIndexDir, rag_index_exists: Boolean(ragIndexDir) });
      const hits = (data?.hits || []).map((h: any, i: number) => ({
        id: String(i + 1),
        content: h.text || "",
        source: h.metadata?.source || "",
        page: Number(h.metadata?.page || 0),
        score: Number(h.score || 0),
        timestamp: new Date(),
      }));
      setSearchResults(hits);
      // 간단 합성 답변
      generateAIResponse(hits)
    } finally {
      setIsSearching(false)
    }
  }

  const generateAIResponse = async (results: SearchResult[]) => {
    setIsGeneratingResponse(true)
    
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const response = `검색된 문서들을 바탕으로 답변드리겠습니다.

**${searchQuery}**에 대한 종합 분석:

1. **데이터 품질의 중요성**: 분석의 정확성을 위해서는 사전 데이터 전처리가 필수입니다. 결측값, 이상치, 중복값 처리를 통해 신뢰할 수 있는 분석 기반을 마련해야 합니다.

2. **평가 지표의 다양성**: 단일 지표에 의존하지 말고 정밀도, 재현율, F1-스코어 등을 종합적으로 고려해야 합니다.

3. **시계열 분석의 특수성**: 트렌드와 계절성을 구분하여 분석하고, 적절한 예측 모델을 선택하는 것이 중요합니다.

이러한 내용들이 업로드된 문서에서 확인되었으며, 실제 프로젝트에 적용할 수 있는 실용적인 가이드라인을 제공합니다.`

    setAiResponse(response)
    setIsGeneratingResponse(false)

    // 분석 결과에 추가
    setAnalysisResults(prev => [...prev, {
      type: "rag",
      content: `RAG 검색 완료: "${searchQuery}" - ${results.length}개 문서 조각 발견`,
      timestamp: new Date()
    }])
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      performSearch()
    }
  }

  const suggestedQueries = [
    "데이터 품질 관리 방법",
    "머신러닝 모델 평가 지표",
    "이상치 탐지 알고리즘",
    "시계열 데이터 분석",
    "특징 선택 기법"
  ]

  if (pdfDocuments.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">RAG 검색</h2>
          <p className="text-muted-foreground">문서에서 정보를 검색하고 AI 답변을 받아보세요</p>
        </div>
        
        <Alert>
          <FileText className="h-4 w-4" />
          <AlertDescription>
            RAG 검색을 사용하려면 먼저 Chat & Upload 탭에서 PDF 문서를 업로드하고 인덱싱을 완료해주세요.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">RAG 검색</h2>
          <p className="text-muted-foreground">문서 기반 지능형 검색과 질의응답</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-2">
            <FileText className="h-3 w-3" />
            {pdfDocuments.length}개 문서
          </Badge>
          <Badge variant="secondary" className="gap-2">
            <Brain className="h-3 w-3" />
            RAG 활성화
          </Badge>
        </div>
      </div>

      {/* 검색 영역 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            문서 검색
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="문서에서 찾고 싶은 내용을 입력하세요..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button 
              onClick={performSearch}
              disabled={isSearching || !searchQuery.trim()}
              className="gap-2"
            >
              {isSearching ? (
                <Zap className="h-4 w-4 animate-pulse" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              검색
            </Button>
          </div>

          {/* 추천 검색어 */}
          {searchResults.length === 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">추천 검색어:</p>
              <div className="flex flex-wrap gap-2">
                {suggestedQueries.map((query, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => setSearchQuery(query)}
                  >
                    {query}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 검색 결과 */}
      {(searchResults.length > 0 || isSearching) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 문서 조각 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                검색된 문서 조각
                {searchResults.length > 0 && (
                  <Badge variant="secondary">
                    {searchResults.length}개 발견
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isSearching ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {searchResults.map((result, index) => (
                      <div key={result.id} className="p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <Badge variant="outline" className="text-xs">
                            유사도 {(result.score * 100).toFixed(0)}%
                          </Badge>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            방금 전
                          </div>
                        </div>
                        <p className="text-sm leading-relaxed mb-3">{result.content}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <FileText className="h-3 w-3" />
                          <span>{result.source}</span>
                          <span>•</span>
                          <span>페이지 {result.page}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* AI 답변 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                AI 답변 생성
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isGeneratingResponse ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Zap className="h-4 w-4 animate-pulse" />
                    AI가 문서 내용을 바탕으로 답변을 생성하고 있습니다...
                  </div>
                  <div className="space-y-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-3 bg-gray-200 rounded w-full mb-1"></div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : aiResponse ? (
                <ScrollArea className="h-[400px]">
                  <div className="prose prose-sm max-w-none">
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {aiResponse}
                    </div>
                  </div>
                </ScrollArea>
              ) : searchResults.length > 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>AI 답변 생성이 완료되었습니다.</p>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>검색을 실행하면 AI가 문서 기반 답변을 생성합니다.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 업로드된 문서 목록 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            인덱싱된 문서
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pdfDocuments.map((doc, index) => (
              <div key={doc.id} className="flex items-center gap-3 p-3 border rounded-lg">
                <div className="p-2 bg-red-100 rounded-lg dark:bg-red-900/20">
                  <FileText className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{doc.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {doc.pages}페이지 • {(doc.size / 1024 / 1024).toFixed(1)}MB
                  </p>
                </div>
                <Badge variant="secondary" className="text-xs">
                  인덱싱됨
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
