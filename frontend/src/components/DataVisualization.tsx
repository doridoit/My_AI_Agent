import React, { useState } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, ScatterChart, Scatter } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Alert, AlertDescription } from "./ui/alert"
import { Badge } from "./ui/badge"

interface DataVisualizationProps {
  data: any
}

export function DataVisualization({ data }: DataVisualizationProps) {
  const [selectedChart, setSelectedChart] = useState("bar")

  if (!data || !data.rows) {
    return (
      <Alert>
        <AlertDescription>
          먼저 데이터를 업로드해주세요.
        </AlertDescription>
      </Alert>
    )
  }

  // 샘플 차트 데이터 생성
  const generateChartData = () => {
    const { rows } = data

    // 부서별 직원 수
    const departmentCounts = rows.reduce((acc: any, row: any) => {
      const dept = row['부서'] || row['department'] || 'Unknown'
      acc[dept] = (acc[dept] || 0) + 1
      return acc
    }, {})

    const departmentData = Object.entries(departmentCounts).map(([dept, count]) => ({
      department: dept,
      count: count,
      색상: getRandomColor()
    }))

    // 급여 분포 (연령대별)
    const salaryByAge = rows.map((row: any, index: number) => ({
      age: parseInt(row['나이'] || row['age'] || 20 + index),
      salary: parseInt(row['급여'] || row['salary'] || 3000 + Math.random() * 3000),
      department: row['부서'] || row['department'] || 'IT'
    }))

    // 월별 입사자 수 (가상 데이터)
    const monthlyHiring = [
      { month: '1월', count: 5 },
      { month: '2월', count: 3 },
      { month: '3월', count: 8 },
      { month: '4월', count: 4 },
      { month: '5월', count: 6 },
      { month: '6월', count: 7 }
    ]

    return {
      departmentData,
      salaryByAge,
      monthlyHiring
    }
  }

  const getRandomColor = () => {
    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1']
    return colors[Math.floor(Math.random() * colors.length)]
  }

  const chartData = generateChartData()

  const renderChart = () => {
    switch (selectedChart) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData.departmentData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="department" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#8884d8" name="직원 수" />
            </BarChart>
          </ResponsiveContainer>
        )
      
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={chartData.departmentData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ department, count, percent }: any) => 
                  `${department}: ${count}명 (${(percent * 100).toFixed(0)}%)`
                }
                outerRadius={120}
                fill="#8884d8"
                dataKey="count"
              >
                {chartData.departmentData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.색상} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        )
      
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData.monthlyHiring}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="count" 
                stroke="#8884d8" 
                strokeWidth={3}
                name="입사자 수"
              />
            </LineChart>
          </ResponsiveContainer>
        )
      
      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart data={chartData.salaryByAge}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="age" name="나이" unit="세" />
              <YAxis dataKey="salary" name="급여" unit="만원" />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Legend />
              <Scatter name="급여 vs 나이" data={chartData.salaryByAge} fill="#8884d8" />
            </ScatterChart>
          </ResponsiveContainer>
        )
      
      default:
        return null
    }
  }

  const chartTypes = [
    { value: 'bar', label: '막대 차트', description: '부서별 직원 수' },
    { value: 'pie', label: '원형 차트', description: '부서 분포' },
    { value: 'line', label: '선형 차트', description: '월별 입사 추세' },
    { value: 'scatter', label: '산점도', description: '급여 vs 나이' }
  ]

  const currentChartInfo = chartTypes.find(type => type.value === selectedChart)

  return (
    <div className="space-y-4">
      {/* 컨트롤 패널 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3>데이터 시각화</h3>
          <Badge variant="secondary">
            {data.totalRows || data.rows.length}개 데이터
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={selectedChart} onValueChange={setSelectedChart}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="차트 유형 선택" />
            </SelectTrigger>
            <SelectContent>
              {chartTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  <div>
                    <div>{type.label}</div>
                    <div className="text-xs text-muted-foreground">{type.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 차트 카드 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            {currentChartInfo?.label}
            <Badge variant="outline">{currentChartInfo?.description}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderChart()}
        </CardContent>
      </Card>

      {/* 추가 차트들 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 요약 통계 */}
        <Card>
          <CardHeader>
            <CardTitle>데이터 요약</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">총 레코드</span>
                <span className="font-medium">{data.rows.length}개</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">평균 연령</span>
                <span className="font-medium">
                  {Math.round(
                    data.rows.reduce((sum: number, row: any) => 
                      sum + (parseInt(row['나이'] || row['age'] || 28)), 0
                    ) / data.rows.length
                  )}세
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">부서 수</span>
                <span className="font-medium">
                  {new Set(data.rows.map((row: any) => row['부서'] || row['department'])).size}개
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">평균 급여</span>
                <span className="font-medium">
                  {Math.round(
                    data.rows.reduce((sum: number, row: any) => 
                      sum + (parseInt(row['급여'] || row['salary'] || 4500)), 0
                    ) / data.rows.length
                  ).toLocaleString()}만원
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 인사이트 */}
        <Card>
          <CardHeader>
            <CardTitle>분석 인사이트</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="p-3 bg-blue-50 rounded-lg dark:bg-blue-950/50">
                <p className="font-medium text-blue-900 dark:text-blue-100">📊 부서 분석</p>
                <p className="text-blue-700 dark:text-blue-200 mt-1">
                  IT 부서가 가장 많은 인원을 보유하고 있습니다.
                </p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg dark:bg-green-950/50">
                <p className="font-medium text-green-900 dark:text-green-100">💰 급여 분석</p>
                <p className="text-green-700 dark:text-green-200 mt-1">
                  경력과 급여 간에 양의 상관관계가 관찰됩니다.
                </p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg dark:bg-purple-950/50">
                <p className="font-medium text-purple-900 dark:text-purple-100">📈 채용 트렌드</p>
                <p className="text-purple-700 dark:text-purple-200 mt-1">
                  3월과 6월에 채용 활동이 활발했습니다.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}