'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react'
import { useAppStore } from '@/stores/app-store'
import { formatPrice } from '@/lib/currency'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type ProductRow = {
  productId: string
  name: string
  quantity: number
  revenue: number
  cost: number
  profit: number
}

type OrderRow = {
  id: string
  createdAt: string
  customerName: string
  status: string
  revenue: number
  cost: number
  profit: number
}

type Payload = {
  summary: { revenue: number; cost: number; profit: number; orders: number }
  byProduct: ProductRow[]
  byOrder: OrderRow[]
}

function moneyClass(value: number) {
  return value < 0 ? 'text-red-600 font-semibold' : 'text-emerald-700 font-semibold'
}

export function AdminFinance() {
  const setView = useAppStore(state => state.setView)
  const selectedCountry = useAppStore(state => state.selectedCountry)
  const [data, setData] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    fetch('/api/admin/finance')
      .then(response => response.json())
      .then(payload => {
        setData(payload)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const summary = data?.summary
  const net = summary?.profit ?? 0

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-3xl font-bold">Profit & Loss</h1>
          <p className="text-muted-foreground">Revenue minus product cost. Set a cost price on each product to calculate margin.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="size-4 mr-1" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => setView({ view: 'admin' })}>
            <ArrowLeft className="size-4 mr-1" /> Dashboard
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Revenue', value: summary?.revenue ?? 0 },
          { label: 'Cost', value: summary?.cost ?? 0 },
          { label: net >= 0 ? 'Profit' : 'Loss', value: Math.abs(net), tone: net >= 0 ? 'profit' : 'loss' },
          { label: 'Orders', value: summary?.orders ?? 0, plain: true },
        ].map(card => (
          <Card key={card.label}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                {card.tone === 'loss' ? <TrendingDown className="size-4 text-red-600" /> : card.tone === 'profit' ? <TrendingUp className="size-4 text-emerald-700" /> : null}
                {card.label}
              </p>
              <p className={`text-2xl font-bold mt-1 ${card.tone === 'loss' ? 'text-red-600' : card.tone === 'profit' ? 'text-emerald-700' : ''}`}>
                {card.plain ? Number(card.value).toLocaleString() : formatPrice(Number(card.value), selectedCountry)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">Loading profit and loss...</CardContent></Card>
      ) : (
        <Tabs defaultValue="product">
          <TabsList>
            <TabsTrigger value="product">Product-wise</TabsTrigger>
            <TabsTrigger value="order">Order-wise</TabsTrigger>
          </TabsList>
          <TabsContent value="product">
            <Card>
              <CardHeader>
                <CardTitle className="font-serif">By product</CardTitle>
                <CardDescription>Net revenue after a share of any order discount, minus unit cost.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Sold</TableHead>
                        <TableHead>Revenue</TableHead>
                        <TableHead>Cost</TableHead>
                        <TableHead>Profit / Loss</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(data?.byProduct || []).length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">No sales yet.</TableCell></TableRow>
                      ) : data?.byProduct.map(row => (
                        <TableRow key={row.productId}>
                          <TableCell className="font-medium">{row.name}</TableCell>
                          <TableCell>{row.quantity}</TableCell>
                          <TableCell>{formatPrice(row.revenue, selectedCountry)}</TableCell>
                          <TableCell>{formatPrice(row.cost, selectedCountry)}</TableCell>
                          <TableCell className={moneyClass(row.profit)}>
                            {row.profit < 0 ? 'Loss ' : 'Profit '}
                            {formatPrice(Math.abs(row.profit), selectedCountry)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="order">
            <Card>
              <CardHeader>
                <CardTitle className="font-serif">By order</CardTitle>
                <CardDescription>Cancelled and refunded orders are left out.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Revenue</TableHead>
                        <TableHead>Cost</TableHead>
                        <TableHead>Profit / Loss</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(data?.byOrder || []).length === 0 ? (
                        <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No sales yet.</TableCell></TableRow>
                      ) : data?.byOrder.map(row => (
                        <TableRow key={row.id}>
                          <TableCell className="font-mono text-xs">{row.id.slice(0, 10)}</TableCell>
                          <TableCell>{row.customerName}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{new Date(row.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell><Badge variant="secondary">{row.status}</Badge></TableCell>
                          <TableCell>{formatPrice(row.revenue, selectedCountry)}</TableCell>
                          <TableCell>{formatPrice(row.cost, selectedCountry)}</TableCell>
                          <TableCell className={moneyClass(row.profit)}>
                            {row.profit < 0 ? 'Loss ' : 'Profit '}
                            {formatPrice(Math.abs(row.profit), selectedCountry)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
