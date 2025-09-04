import React, { useState } from "react"
import { ChevronLeft, ChevronRight, Search, Filter } from "lucide-react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { Alert, AlertDescription } from "./ui/alert"

interface DataTableProps {
  data: any
}

export function DataTable({ data }: DataTableProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")
  const [itemsPerPage] = useState(10)

  if (!data) {
    return (
      <Alert>
        <AlertDescription>
          먼저 데이터를 업로드해주세요.
        </AlertDescription>
      </Alert>
    )
  }

  const { headers, rows, totalRows } = data

  // 검색 필터링
  const filteredRows = rows.filter((row: any) =>
    Object.values(row).some((value: any) =>
      String(value).toLowerCase().includes(searchTerm.toLowerCase())
    )
  )

  // 페이지네이션
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedRows = filteredRows.slice(startIndex, endIndex)
  const totalPages = Math.ceil(filteredRows.length / itemsPerPage)

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(totalPages, page)))
  }

  return (
    <div className="space-y-4">
      {/* 데이터 정보 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3>데이터 미리보기</h3>
          <Badge variant="secondary">
            총 {totalRows || rows.length}개 행
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="데이터 검색..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
              className="pl-10 w-64"
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-1" />
            필터
          </Button>
        </div>
      </div>

      {/* 테이블 */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {headers.map((header: string, index: number) => (
                    <TableHead key={index} className="whitespace-nowrap">
                      {header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRows.length > 0 ? (
                  paginatedRows.map((row: any, rowIndex: number) => (
                    <TableRow key={rowIndex}>
                      {headers.map((header: string, cellIndex: number) => (
                        <TableCell key={cellIndex} className="whitespace-nowrap">
                          {row[header] || '-'}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={headers.length} className="text-center py-8 text-muted-foreground">
                      {searchTerm ? '검색 결과가 없습니다.' : '데이터가 없습니다.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {startIndex + 1}-{Math.min(endIndex, filteredRows.length)}개 표시 (총 {filteredRows.length}개)
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              이전
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = i + Math.max(1, currentPage - 2)
                if (pageNum > totalPages) return null
                
                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === currentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => goToPage(pageNum)}
                    className="w-8 h-8 p-0"
                  >
                    {pageNum}
                  </Button>
                )
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              다음
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}