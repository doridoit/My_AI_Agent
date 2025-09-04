import React, { useState, useRef, useEffect } from "react"
import { Send, Bot, User, Loader2 } from "lucide-react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { ScrollArea } from "./ui/scroll-area"
import { Card, CardContent } from "./ui/card"
import { Avatar, AvatarFallback } from "./ui/avatar"
import { Badge } from "./ui/badge"
import { Alert, AlertDescription } from "./ui/alert"
import { chat } from "../lib/api"

interface Message {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: Date
  analysisType?: string
}

interface AIChatProps {
  data: any
  pdfDocuments?: any[]
  onAnalysisResult: (result: any) => void
  isRAGEnabled?: boolean
  ragIndexDir?: string | null
}

export function AIChat({ data, pdfDocuments = [], onAnalysisResult, isRAGEnabled = false, ragIndexDir = null }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: `안녕하세요! 저는 AI 데이터 분석 에이전트입니다. 

${data ? '✅ CSV 데이터가 로드되어 있습니다.' : '📊 CSV 데이터를 업로드하면 분석해드릴 수 있습니다.'}
${pdfDocuments.length > 0 ? `📚 ${pdfDocuments.length}개의 PDF 문서가 인덱싱되어 있습니다.` : '📄 PDF 문서를 업로드하면 문서 기반 질의응답이 가능합니다.'}

무엇을 도와드릴까요?`,
      timestamp: new Date()
    }
  ])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const scrollAreaRef = useRef<React.ElementRef<typeof ScrollArea>>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 메시지 추가 시 스크롤 하단으로 이동
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue("")
    setIsLoading(true)

    try {
      const resp = await chat(inputValue, {
        uploadedData: data,
        index_dir: ragIndexDir,
        rag_index_exists: Boolean(ragIndexDir),
      });
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: String(resp?.answer ?? "응답이 없습니다."),
        timestamp: new Date(),
        analysisType: undefined,
      }
      setMessages(prev => [...prev, aiMessage])
    } catch (e: any) {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: `오류: ${String(e)}`,
        timestamp: new Date(),
        analysisType: undefined,
      }
      setMessages(prev => [...prev, aiMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const generateAIResponse = (query: string, data: any) => {
    const lowerQuery = query.toLowerCase()
    
    // RAG 검색 시뮬레이션
    let ragContext = ""
    if (isRAGEnabled && pdfDocuments.length > 0) {
      // 간단한 키워드 매칭으로 RAG 시뮬레이션
      const keywords = ["데이터", "분석", "통계", "모델", "예측", "시각화"]
      const hasKeyword = keywords.some(keyword => lowerQuery.includes(keyword))
      
      if (hasKeyword) {
        ragContext = `

📚 **문서 검색 결과:**
관련 문서에서 다음 내용을 찾았습니다:
- "데이터 품질이 분석의 정확성을 좌우합니다"
- "탐색적 데이터 분석은 모든 분석의 첫 단계입니다"
- "시각화를 통해 패턴을 쉽게 발견할 수 있습니다"

위 정보를 바탕으로 답변드리겠습니다.`
      } else {
        ragContext = `

💡 **RAG 검색:** 문서에서 관련 정보를 찾지 못했습니다. CSV 데이터 위주로 답변드리겠습니다.`
      }
    }

    if (!data && pdfDocuments.length === 0) {
      return {
        content: "데이터나 문서를 업로드해주세요. CSV 데이터로 분석하거나 PDF 문서로 질의응답이 가능합니다.",
        analysisType: null,
        analysisResult: null
      }
    }

    // 다양한 분석 쿼리에 대한 응답
    if (lowerQuery.includes('요약') || lowerQuery.includes('개요')) {
      const summary = data ? generateDataSummary(data) : "문서 기반 요약을 제공합니다."
      return {
        content: `${data ? '데이터' : '문서'} 요약 결과입니다:${ragContext}\n\n${summary}`,
        analysisType: "데이터 요약",
        analysisResult: {
          type: "summary",
          content: summary,
          timestamp: new Date()
        }
      }
    }

    if (lowerQuery.includes('통계') || lowerQuery.includes('기본 통계')) {
      const stats = generateBasicStats(data)
      return {
        content: `기본 통계 분석 결과입니다:\n\n${stats}`,
        analysisType: "기본 통계",
        analysisResult: {
          type: "statistics",
          content: stats,
          timestamp: new Date()
        }
      }
    }

    if (lowerQuery.includes('상관관계') || lowerQuery.includes('correlation')) {
      return {
        content: "수치형 데이터 간의 상관관계를 분석했습니다. 급여와 나이 간에 약한 양의 상관관계(r=0.23)가 있으며, 경력과 급여 간에 강한 양의 상관관계(r=0.78)가 관찰됩니다.",
        analysisType: "상관관계 분석",
        analysisResult: {
          type: "correlation",
          content: "상관관계 분석 완료",
          timestamp: new Date()
        }
      }
    }

    if (lowerQuery.includes('시각화') || lowerQuery.includes('그래프') || lowerQuery.includes('차트')) {
      return {
        content: "데이터 시각화를 제안드립니다:\n\n1. 부서별 급여 분포 - 박스 플롯\n2. 나이대별 직원 수 - 히스토그램\n3. 시간에 따른 입사 추세 - 선 그래프\n\n시각화 탭에서 확인하실 수 있습니다.",
        analysisType: "시각화 제안",
        analysisResult: {
          type: "visualization",
          content: "시각화 제안 완료",
          timestamp: new Date()
        }
      }
    }

    if (lowerQuery.includes('예측') || lowerQuery.includes('predict')) {
      return {
        content: "현재 데이터를 바탕으로 다음 분기 채용 예측을 수행했습니다:\n\n• IT 부서: 3-4명 추가 채용 예상\n• 마케팅 부서: 2명 추가 채용 예상\n• 평균 급여 상승률: 5-8% 예상",
        analysisType: "예측 분석",
        analysisResult: {
          type: "prediction",
          content: "예측 분석 완료",
          timestamp: new Date()
        }
      }
    }

    // 기본 응답
    const dataInfo = data ? `현재 ${data.totalRows || data.rows?.length || 0}개의 데이터 행이 있습니다.` : ""
    const pdfInfo = pdfDocuments.length > 0 ? `${pdfDocuments.length}개의 PDF 문서가 인덱싱되어 있습니다.` : ""
    
    return {
      content: `"${query}"에 대해 분석하겠습니다.${ragContext}

${dataInfo} ${pdfInfo}

🔍 **가능한 분석:**
• 데이터 요약 및 기본 통계
• 상관관계 분석  
• 시각화 제안
• 예측 분석
${pdfDocuments.length > 0 ? '• 문서 기반 질의응답' : ''}

구체적으로 어떤 분석을 원하시는지 말씀해 주세요.`,
      analysisType: "일반 분석",
      analysisResult: {
        type: "general",
        content: "일반 분석 응답",
        timestamp: new Date()
      }
    }
  }

  const generateDataSummary = (data: any) => {
    if (!data.rows || data.rows.length === 0) {
      return "데이터가 비어있습니다."
    }

    const rowCount = data.rows.length
    const columnCount = data.headers?.length || 0
    
    return `• 총 행 수: ${rowCount}개
• 총 열 수: ${columnCount}개
• 데이터 타입: ${data.type?.toUpperCase() || 'Unknown'}
• 업로드 시간: ${new Date(data.uploadedAt).toLocaleString('ko-KR')}

주요 컬럼: ${data.headers?.slice(0, 5).join(', ') || '없음'}`
  }

  const generateBasicStats = (data: any) => {
    if (!data.rows || data.rows.length === 0) {
      return "통계를 계산할 데이터가 없습니다."
    }

    return `• 총 레코드 수: ${data.rows.length}개
• 결측값: 검사 완료
• 데이터 품질: 양호
• 수치형 컬럼: 급여, 나이 등
• 범주형 컬럼: 부서, 직업 등

추천 분석: 부서별 급여 비교, 나이대별 분포 분석`
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const suggestedQueries = data && pdfDocuments.length > 0 ? [
    "데이터를 요약해줘",
    "문서에서 분석 방법론을 찾아줘",
    "상관관계 분석해줘", 
    "시각화를 제안해줘",
    "문서 기반으로 예측 모델을 추천해줘"
  ] : data ? [
    "데이터를 요약해줘",
    "기본 통계를 알려줘",
    "상관관계 분석해줘",
    "시각화를 제안해줘",
    "예측 분석을 해줘"
  ] : pdfDocuments.length > 0 ? [
    "문서에서 데이터 분석 방법을 찾아줘",
    "머신러닝 모델에 대해 알려줘",
    "통계 분석 기법을 설명해줘",
    "데이터 전처리 방법을 알려줘",
    "시각화 기법을 추천해줘"
  ] : [
    "데이터를 업로드해주세요",
    "PDF 문서를 업로드해주세요"
  ]

  return (
    <div className="flex flex-col h-full">
      {!data && (
        <Alert className="mb-4">
          <AlertDescription>
            AI와 대화하려면 먼저 데이터를 업로드해주세요.
          </AlertDescription>
        </Alert>
      )}

      {/* 메시지 영역 */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start gap-3 ${
                message.type === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.type === 'ai' && (
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback>
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              )}
              
              <Card className={`max-w-[80%] overflow-hidden ${message.type === 'user' ? 'bg-primary text-primary-foreground' : ''}`}>
                <CardContent className="p-3">
                  <div className="space-y-2">
                    {message.analysisType && (
                      <Badge variant="secondary" className="mb-2">
                        {message.analysisType}
                      </Badge>
                    )}
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                      {message.content}
                    </p>
                    <div className="text-xs opacity-70">
                      {message.timestamp.toLocaleTimeString('ko-KR', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {message.type === 'user' && (
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback>
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="flex items-start gap-3">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarFallback>
                  <Bot className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">AI가 분석 중입니다...</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* 추천 쿼리 (메시지가 적을 때만 표시) */}
      {messages.length <= 2 && data && (
        <div className="p-4 border-t">
          <p className="text-sm text-muted-foreground mb-2">추천 질문:</p>
          <div className="flex flex-wrap gap-2">
            {suggestedQueries.map((query, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => setInputValue(query)}
                disabled={isLoading}
              >
                {query}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* 입력 영역 */}
      <div className="p-4 border-t">
        <div className="flex items-end gap-2">
          <Input
            placeholder="데이터 분석에 대해 질문해보세요..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
            className="flex-1"
          />
          <Button 
            onClick={handleSendMessage} 
            disabled={!inputValue.trim() || isLoading}
            size="icon"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
