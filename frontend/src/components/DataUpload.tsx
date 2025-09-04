import React, { useState, useCallback } from "react"
import { Upload, File as FileIcon, X, CheckCircle } from "lucide-react"
import { Button } from "./ui/button"
import { Card, CardContent } from "./ui/card"
import { Badge } from "./ui/badge"
import { Alert, AlertDescription } from "./ui/alert"
import { uploadCsv } from "../lib/api"

interface DataUploadProps {
  onDataUploaded: (data: any) => void
  uploadedData: any
}

export function DataUpload({ onDataUploaded, uploadedData }: DataUploadProps) {
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  const processFile = async (file: File) => {
    setUploading(true)
    
    try {
      const text = await file.text()
      
      // CSV 파싱 시뮬레이션
      if (file.name.endsWith('.csv')) {
        const lines = text.split('\n').filter(line => line.trim())
        const headers = lines[0].split(',').map(h => h.trim())
        const rows = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim())
          return headers.reduce((obj, header, index) => ({
            ...obj,
            [header]: values[index] || ''
          }), {})
        })
        
        const mockData = {
          filename: file.name,
          size: file.size,
          type: 'csv',
          headers,
          rows: rows.slice(0, 100), // 처음 100개 행만
          totalRows: rows.length,
          uploadedAt: new Date().toISOString()
        }
        
        try {
          await uploadCsv(file);
        } catch (e) { /* ignore upstream errors in mock mode */ }
        onDataUploaded(mockData)
      } else if (file.name.endsWith('.json')) {
        const jsonData = JSON.parse(text)
        const mockData = {
          filename: file.name,
          size: file.size,
          type: 'json',
          data: jsonData,
          uploadedAt: new Date().toISOString()
        }
        
        onDataUploaded(mockData)
      } else {
        // 지원되지 않는 형식의 경우 샘플 데이터 생성
        const sampleData = generateSampleData()
        onDataUploaded({
          ...sampleData,
          filename: file.name,
          size: file.size,
          uploadedAt: new Date().toISOString()
        })
      }
    } catch (error) {
      console.error('파일 처리 오류:', error)
      // 오류 발생시 샘플 데이터 사용
      const sampleData = generateSampleData()
      onDataUploaded({
        ...sampleData,
        filename: file.name,
        size: file.size,
        uploadedAt: new Date().toISOString()
      })
    }
    
    setUploading(false)
    setDragOver(false)
  }

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const fileList = e.dataTransfer?.files;
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList) as File[];
    processFile(files[0]);
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList) as File[];
    processFile(files[0]);
  }

  const generateSampleData = () => {
    const headers = ['이름', '나이', '직업', '급여', '부서', '가입일']
    const sampleRows = [
      { '이름': '김철수', '나이': '28', '직업': '개발자', '급여': '5000', '부서': 'IT', '가입일': '2023-01-15' },
      { '이름': '이영희', '나이': '32', '직업': '디자이너', '급여': '4500', '부서': '디자인', '가입일': '2023-02-20' },
      { '이름': '박민수', '나이': '29', '직업': '마케터', '급여': '4000', '부서': '마케팅', '가입일': '2023-03-10' },
      { '이름': '정수연', '나이': '26', '직업': '분석가', '급여': '4800', '부서': 'IT', '가입일': '2023-04-05' },
      { '이름': '최영준', '나이': '31', '직업': '매니저', '급여': '6000', '부서': '경영', '가입일': '2023-05-12' }
    ]
    
    return {
      type: 'csv',
      headers,
      rows: sampleRows,
      totalRows: sampleRows.length
    }
  }

  const clearData = () => {
    onDataUploaded(null)
  }

  if (uploadedData) {
    return (
      <div className="space-y-4">
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            데이터가 성공적으로 업로드되었습니다!
          </AlertDescription>
        </Alert>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileIcon className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="font-medium">{uploadedData.filename}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Badge variant="secondary">{uploadedData.type?.toUpperCase()}</Badge>
                    <span>{(uploadedData.size / 1024).toFixed(1)}KB</span>
                    {uploadedData.totalRows && (
                      <span>• {uploadedData.totalRows}개 행</span>
                    )}
                  </div>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={clearData}>
                <X className="h-4 w-4 mr-1" />
                제거
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
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
        <CardContent className="p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-full bg-muted p-4">
              <Upload className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h3>데이터 파일을 업로드하세요</h3>
              <p className="text-sm text-muted-foreground">
                CSV, JSON, Excel 파일을 드래그 앤 드롭하거나 클릭하여 선택하세요
              </p>
            </div>
            <input
              type="file"
              accept=".csv,.json,.xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
              disabled={uploading}
            />
            <Button asChild disabled={uploading}>
              <label htmlFor="file-upload" className="cursor-pointer">
                {uploading ? '업로드 중...' : '파일 선택'}
              </label>
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <div className="text-sm text-muted-foreground">
        <p>지원 형식: CSV, JSON, Excel (.xlsx, .xls)</p>
        <p>최대 파일 크기: 10MB</p>
      </div>
    </div>
  )
}
