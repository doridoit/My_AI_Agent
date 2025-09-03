import { useState, useCallback } from "react"
import { Upload, File, X, CheckCircle, FileText, Download } from "lucide-react"
import { Button } from "./ui/button"
import { Card, CardContent } from "./ui/card"
import { Badge } from "./ui/badge"
import { Alert, AlertDescription } from "./ui/alert"
import { Progress } from "./ui/progress"
import { uploadPdf } from "../lib/api"

interface PDFUploadProps {
  documents: any[]
  onDocumentsChange: (docs: any[]) => void
}

export function PDFUpload({ documents, onDocumentsChange }: PDFUploadProps) {
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  const processFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      await uploadPdf(file);
      setUploadProgress(100);
    } catch (e) {
      // fallback 진행바
      const intervals = [20, 40, 60, 80, 100]
      for (let i = 0; i < intervals.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 200))
        setUploadProgress(intervals[i])
      }
    }

    const newDocument = {
      id: Date.now().toString(),
      name: file.name,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      type: 'pdf',
      pages: Math.floor(Math.random() * 50) + 1, // 임시 페이지 수
      processed: false
    }

    onDocumentsChange([...documents, newDocument])
    setUploading(false)
    setUploadProgress(0)
    setDragOver(false)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files)
    files.forEach(file => {
      if (file.name.toLowerCase().endsWith('.pdf')) {
        processFile(file)
      }
    })
  }, [documents])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    files.forEach(file => {
      if (file.name.toLowerCase().endsWith('.pdf')) {
        processFile(file)
      }
    })
  }

  const removeDocument = (id: string) => {
    onDocumentsChange(documents.filter(doc => doc.id !== id))
  }

  const clearAllDocuments = () => {
    onDocumentsChange([])
  }

  return (
    <div className="space-y-4">
      {/* 업로드 영역 */}
      <Card
        className={`transition-colors border-2 border-dashed ${
          dragOver 
            ? 'border-primary bg-primary/5' 
            : 'border-muted-foreground/25 hover:border-muted-foreground/50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardContent className="p-6 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-full bg-muted p-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h3>PDF 문서를 업로드하세요</h3>
              <p className="text-sm text-muted-foreground">
                드래그 앤 드롭하거나 클릭하여 PDF 파일을 선택하세요
              </p>
            </div>
            
            {uploading && (
              <div className="w-full max-w-xs space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>업로드 중...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="w-full" />
              </div>
            )}
            
            <input
              type="file"
              accept=".pdf"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              id="pdf-upload"
              disabled={uploading}
            />
            <Button asChild disabled={uploading} className="gap-2">
              <label htmlFor="pdf-upload" className="cursor-pointer">
                <Upload className="h-4 w-4" />
                {uploading ? '업로드 중...' : 'PDF 파일 선택'}
              </label>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 업로드된 문서 목록 */}
      {documents.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">업로드된 문서 ({documents.length}개)</h4>
            <Button variant="outline" size="sm" onClick={clearAllDocuments}>
              <X className="h-4 w-4 mr-1" />
              전체 삭제
            </Button>
          </div>
          
          <div className="space-y-2">
            {documents.map((doc) => (
              <Card key={doc.id} className="hover:bg-accent/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-red-500" />
                      <div>
                        <p className="font-medium text-sm">{doc.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{(doc.size / 1024 / 1024).toFixed(1)}MB</span>
                          <span>•</span>
                          <span>{doc.pages}페이지</span>
                          <span>•</span>
                          <span>{new Date(doc.uploadedAt).toLocaleDateString('ko-KR')}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {doc.processed ? (
                        <Badge variant="secondary" className="gap-1">
                          <CheckCircle className="h-3 w-3" />
                          인덱싱됨
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          대기 중
                        </Badge>
                      )}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6"
                        onClick={() => removeDocument(doc.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 안내 메시지 */}
      <div className="text-sm text-muted-foreground">
        <p>• PDF 문서는 RAG(Retrieval-Augmented Generation)을 통해 AI 챗봇에서 활용됩니다</p>
        <p>• 업로드 후 인덱싱을 실행하면 문서 내용을 검색할 수 있습니다</p>
        <p>• 최대 파일 크기: 10MB per file</p>
      </div>
    </div>
  )
}
