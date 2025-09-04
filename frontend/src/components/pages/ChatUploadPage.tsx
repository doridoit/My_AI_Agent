import React, { useState } from "react"
import { Upload, FileText, Database, Brain, Zap, RefreshCw, MessageSquare } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { Progress } from "../ui/progress"
import { Alert, AlertDescription } from "../ui/alert"
import { DataUpload } from "../DataUpload"
import { AIChat } from "../AIChat"
import { PDFUpload } from "../PDFUpload"

interface ChatUploadPageProps {
  uploadedData: any
  setUploadedData: React.Dispatch<React.SetStateAction<any>>
  pdfDocuments: any[]
  setPdfDocuments: React.Dispatch<React.SetStateAction<any[]>>
  analysisResults: any[]
  setAnalysisResults: React.Dispatch<React.SetStateAction<any[]>>
  ragIndexDir?: string | null
  setRagIndexDir?: React.Dispatch<React.SetStateAction<string | null>>
}

export function ChatUploadPage({
  uploadedData,
  setUploadedData,
  pdfDocuments,
  setPdfDocuments,
  analysisResults,
  setAnalysisResults,
  ragIndexDir = null,
  setRagIndexDir,
}: ChatUploadPageProps) {
  const [isIndexing, setIsIndexing] = useState(false)
  const [indexingProgress, setIndexingProgress] = useState(0)
  const [autoReindexing, setAutoReindexing] = useState(true)

  const handleStartIndexing = async () => {
    if (pdfDocuments.length === 0) return

    setIsIndexing(true)
    setIndexingProgress(0)

    try {
      const files: File[] = pdfDocuments.map((d: any) => d.file).filter(Boolean)
      if (files.length === 0) {
        throw new Error('인덱싱할 PDF 파일 객체가 없습니다. 다시 업로드 해주세요.')
      }
      // 진행률 간단 시뮬레이션 + 실제 API 호출
      const intervals = [15, 35, 55, 75]
      for (let i = 0; i < intervals.length; i++) {
        await new Promise(r => setTimeout(r, 500))
        setIndexingProgress(intervals[i])
      }
      const { ragIndex } = await import("../../lib/api")
      const res = await ragIndex(files)
      setIndexingProgress(100)
      // 문서 상태 업데이트
      setPdfDocuments(pdfDocuments.map((d: any) => ({ ...d, processed: true })))
      // 인덱스 경로 저장 (전역)
      if (typeof (setRagIndexDir) === 'function') {
        setRagIndexDir(res?.index_dir || null)
      }
      setAnalysisResults(prev => [...prev, {
        type: "indexing",
        content: `${pdfDocuments.length}개 PDF 문서 인덱싱 완료.`,
        timestamp: new Date()
      }])
    } catch (e) {
      setAnalysisResults(prev => [...prev, {
        type: "indexing_error",
        content: `인덱싱 실패: ${String(e)}`,
        timestamp: new Date()
      }])
    } finally {
      setIsIndexing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Chat & Upload</h2>
          <p className="text-muted-foreground">데이터와 문서를 업로드하고 AI와 대화하세요</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-2">
            <Database className="h-3 w-3" />
            {uploadedData ? "CSV 로드됨" : "CSV 없음"}
          </Badge>
          <Badge variant="outline" className="gap-2">
            <FileText className="h-3 w-3" />
            PDF {pdfDocuments.length}개
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 업로드 섹션 */}
        <div className="lg:col-span-1 space-y-4">
          <Tabs defaultValue="csv" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="csv" className="gap-2">
                <Database className="h-4 w-4" />
                CSV 데이터
              </TabsTrigger>
              <TabsTrigger value="pdf" className="gap-2">
                <FileText className="h-4 w-4" />
                PDF 문서
              </TabsTrigger>
            </TabsList>

            <TabsContent value="csv" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    CSV 데이터 업로드
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <DataUpload 
                    onDataUploaded={setUploadedData}
                    uploadedData={uploadedData}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pdf" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    PDF 문서 업로드
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <PDFUpload 
                    documents={pdfDocuments}
                    onDocumentsChange={setPdfDocuments}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* RAG 인덱싱 섹션 */}
          {pdfDocuments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  RAG 인덱싱
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <Zap className="h-4 w-4" />
                  <AlertDescription>
                    PDF 문서를 AI가 이해할 수 있도록 인덱싱합니다.
                  </AlertDescription>
                </Alert>

                {isIndexing && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>인덱싱 진행중...</span>
                      <span>{indexingProgress}%</span>
                    </div>
                    <Progress value={indexingProgress} className="w-full" />
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <Button 
                    onClick={handleStartIndexing}
                    disabled={isIndexing || pdfDocuments.length === 0}
                    className="w-full gap-2"
                  >
                    {isIndexing ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Brain className="h-4 w-4" />
                    )}
                    {isIndexing ? "인덱싱 중..." : "📚 PDF 인덱싱 실행"}
                  </Button>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <input 
                      type="checkbox" 
                      id="auto-reindex"
                      checked={autoReindexing}
                      onChange={(e) => setAutoReindexing(e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="auto-reindex" className="text-muted-foreground">
                      자동 재인덱싱
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* MCP 서버 상태 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                MCP 서버 상태
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Core Server (8001)</span>
                  <Badge variant="secondary" className="gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    Online
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Data Tools (8002)</span>
                  <Badge variant="secondary" className="gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    Ready
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI 채팅 섹션 */}
        <div className="lg:col-span-2">
          <Card className="h-[700px]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                AI 분석 챗봇
                <Badge variant="outline" className="ml-auto">
                  LangChain + RAG
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="h-full p-0">
              <AIChat 
                data={uploadedData}
                pdfDocuments={pdfDocuments}
                onAnalysisResult={(result) => setAnalysisResults(prev => [...prev, result])}
                isRAGEnabled={pdfDocuments.length > 0}
                ragIndexDir={typeof (ragIndexDir) !== 'undefined' ? ragIndexDir : null}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
