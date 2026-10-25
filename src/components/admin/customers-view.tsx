'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, RefreshCw, Search, Users } from 'lucide-react'
import { useAppStore } from '@/stores/app-store'
import { formatPrice } from '@/lib/currency'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type Customer = {
  email: string
  name: string
  phone: string | null
  signedUp: boolean
  orders: number
  totalSpent: number
  firstSeen: string
  lastOrderAt: string | null
}

type Payload = {
  customers: Customer[]
  totals: { customers: number; signedUp: number; buyers: number }
}

export function AdminCustomers() {
  const setView = useAppStore(state => state.setView)
  const selectedCountry = useAppStore(state => state.selectedCountry)
  const [data, setData] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const load = () => {
    setLoading(true)
    fetch('/api/admin/customers')
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

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase()
    const customers = data?.customers || []
    if (!query) return customers
    return customers.filter(customer =>
      customer.name.toLowerCase().includes(query) ||
      customer.email.toLowerCase().includes(query) ||
      (customer.phone || '').toLowerCase().includes(query),
    )
  }, [data, search])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-3xl font-bold">Customers</h1>
          <p className="text-muted-foreground">Accounts created on the site and people who place an order</p>
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'All customers', value: data?.totals.customers ?? 0 },
          { label: 'Signed up', value: data?.totals.signedUp ?? 0 },
          { label: 'Have purchased', value: data?.totals.buyers ?? 0 },
        ].map(card => (
          <Card key={card.label}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <p className="text-2xl font-bold mt-1">{card.value.toLocaleString()}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="relative max-w-md mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search name, email, or phone" className="pl-9" />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-10 text-center text-muted-foreground">Loading customers...</div>
          ) : rows.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">
              <Users className="size-8 mx-auto mb-2 opacity-40" />
              No customers yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead>Spent</TableHead>
                    <TableHead>First seen</TableHead>
                    <TableHead>Last order</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(customer => (
                    <TableRow key={customer.email}>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell>{customer.email}</TableCell>
                      <TableCell>{customer.phone || '—'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {customer.signedUp && <Badge variant="secondary">Signed up</Badge>}
                          {customer.orders > 0 && <Badge variant="outline">Purchased</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>{customer.orders}</TableCell>
                      <TableCell>{formatPrice(customer.totalSpent, selectedCountry)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(customer.firstSeen).toLocaleDateString()}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {customer.lastOrderAt ? new Date(customer.lastOrderAt).toLocaleDateString() : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
