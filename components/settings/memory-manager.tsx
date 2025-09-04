"use client"

import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, Edit, Plus, Brain, Calendar, Star } from "lucide-react"
import { onAuthStateChanged, User } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { toast } from "sonner"

interface Memory {
  id: string
  content: string
  category: string
  importance_score: number
  confidence_score: number
  last_accessed: string
  access_count: number
  source_type: string
  source_message?: string
  createdAt: string
  keywords: string[]
  sentiment: string
  themes: string[]
}

const categoryColors = {
  spending: "bg-red-100 text-red-800",
  income: "bg-green-100 text-green-800",
  goals: "bg-blue-100 text-blue-800",
  habits: "bg-purple-100 text-purple-800",
  relationships: "bg-pink-100 text-pink-800",
  expectations: "bg-yellow-100 text-yellow-800",
  investments: "bg-indigo-100 text-indigo-800",
  debts: "bg-orange-100 text-orange-800",
  conversation: "bg-gray-100 text-gray-800",
  general: "bg-slate-100 text-slate-800"
}

const importanceColors = {
  low: "text-gray-500",
  medium: "text-yellow-500", 
  high: "text-orange-500",
  critical: "text-red-500"
}

function getImportanceLevel(score: number) {
  if (score <= 3) return "low"
  if (score <= 6) return "medium"
  if (score <= 8) return "high"
  return "critical"
}

export default function MemoryManager() {
  const [user, setUser] = useState<User | null>(null)
  const [memories, setMemories] = useState<Memory[]>([])
  const [loading, setLoading] = useState(true)
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("importance")

  // New memory form state
  const [newMemory, setNewMemory] = useState({
    content: "",
    category: "general",
    importance: 5
  })

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      if (currentUser) {
        fetchMemories(currentUser)
      } else {
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [])

  const fetchMemories = async (currentUser: User) => {
    try {
      const response = await fetch('/api/memories', {
        headers: {
          'Authorization': `Bearer ${await currentUser.getIdToken()}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        // Transform the memories to include proper IDs
        const transformedMemories = data.memories.map((memory: any, index: number) => ({
          ...memory,
          id: memory.id || `memory_${index}_${Date.now()}`
        }))
        setMemories(transformedMemories)
      } else {
        toast.error('Failed to fetch memories')
      }
    } catch (error) {
      console.error('Error fetching memories:', error)
      toast.error('Error loading memories')
    } finally {
      setLoading(false)
    }
  }

  const deleteMemory = async (memoryId: string) => {
    if (!confirm('Are you sure you want to delete this memory?')) return
    if (!user) return

    try {
      const response = await fetch(`/api/memories/${memoryId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${await user.getIdToken()}`
        }
      })

      if (response.ok) {
        setMemories(memories.filter(m => m.id !== memoryId))
        toast.success('Memory deleted successfully')
      } else {
        toast.error('Failed to delete memory')
      }
    } catch (error) {
      console.error('Error deleting memory:', error)
      toast.error('Error deleting memory')
    }
  }

  const updateMemory = async (memoryId: string, updates: Partial<Memory>) => {
    if (!user) return

    try {
      const response = await fetch(`/api/memories/${memoryId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${await user.getIdToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      })

      if (response.ok) {
        setMemories(memories.map(m => 
          m.id === memoryId ? { ...m, ...updates } : m
        ))
        setEditingMemory(null)
        toast.success('Memory updated successfully')
      } else {
        toast.error('Failed to update memory')
      }
    } catch (error) {
      console.error('Error updating memory:', error)
      toast.error('Error updating memory')
    }
  }

  const addMemory = async () => {
    if (!newMemory.content.trim()) {
      toast.error('Memory content is required')
      return
    }
    if (!user) return

    try {
      const response = await fetch('/api/memories', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await user.getIdToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: newMemory.content,
          category: newMemory.category,
          importance: newMemory.importance,
          source_type: 'user_input'
        })
      })

      if (response.ok) {
        const data = await response.json()
        setMemories([data.memory, ...memories])
        setNewMemory({ content: "", category: "general", importance: 5 })
        setShowAddForm(false)
        toast.success('Memory added successfully')
      } else {
        toast.error('Failed to add memory')
      }
    } catch (error) {
      console.error('Error adding memory:', error)
      toast.error('Error adding memory')
    }
  }

  // Filter and sort memories
  const filteredMemories = memories
    .filter(memory => filterCategory === "all" || memory.category === filterCategory)
    .sort((a, b) => {
      switch (sortBy) {
        case "importance":
          return b.importance_score - a.importance_score
        case "recent":
          return new Date(b.last_accessed).getTime() - new Date(a.last_accessed).getTime()
        case "created":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case "access":
          return b.access_count - a.access_count
        default:
          return 0
      }
    })

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Memory Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading memories...</div>
        </CardContent>
      </Card>
    )
  }

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Memory Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Please sign in to manage your memories.</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          AI Memory Management
        </CardTitle>
        <CardDescription>
          View and manage what A.I.D.A. remembers about your financial habits and preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Controls */}
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-4">
            <div>
              <Label htmlFor="category-filter">Filter by Category</Label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="spending">Spending</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="goals">Goals</SelectItem>
                  <SelectItem value="habits">Habits</SelectItem>
                  <SelectItem value="relationships">Relationships</SelectItem>
                  <SelectItem value="expectations">Expectations</SelectItem>
                  <SelectItem value="investments">Investments</SelectItem>
                  <SelectItem value="debts">Debts</SelectItem>
                  <SelectItem value="conversation">Conversation</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="sort-by">Sort by</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="importance">Importance</SelectItem>
                  <SelectItem value="recent">Recently Accessed</SelectItem>
                  <SelectItem value="created">Recently Created</SelectItem>
                  <SelectItem value="access">Most Accessed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={() => setShowAddForm(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Memory
          </Button>
        </div>

        {/* Add Memory Form */}
        {showAddForm && (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-lg">Add New Memory</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="memory-content">Memory Content</Label>
                <Textarea
                  id="memory-content"
                  placeholder="What should A.I.D.A. remember about you?"
                  value={newMemory.content}
                  onChange={(e) => setNewMemory({ ...newMemory, content: e.target.value })}
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="memory-category">Category</Label>
                  <Select value={newMemory.category} onValueChange={(value) => setNewMemory({ ...newMemory, category: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="spending">Spending</SelectItem>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="goals">Goals</SelectItem>
                      <SelectItem value="habits">Habits</SelectItem>
                      <SelectItem value="relationships">Relationships</SelectItem>
                      <SelectItem value="expectations">Expectations</SelectItem>
                      <SelectItem value="investments">Investments</SelectItem>
                      <SelectItem value="debts">Debts</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="memory-importance">Importance (1-10)</Label>
                  <Input
                    id="memory-importance"
                    type="number"
                    min="1"
                    max="10"
                    value={newMemory.importance}
                    onChange={(e) => setNewMemory({ ...newMemory, importance: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={addMemory}>Add Memory</Button>
                <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Memory Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{memories.length}</div>
            <div className="text-sm text-muted-foreground">Total Memories</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {memories.filter(m => m.importance_score >= 8).length}
            </div>
            <div className="text-sm text-muted-foreground">High Importance</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {Math.round(memories.reduce((sum, m) => sum + m.access_count, 0) / memories.length) || 0}
            </div>
            <div className="text-sm text-muted-foreground">Avg Access Count</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {new Set(memories.map(m => m.category)).size}
            </div>
            <div className="text-sm text-muted-foreground">Categories Used</div>
          </div>
        </div>

        {/* Memory List */}
        <div className="space-y-4">
          {filteredMemories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {filterCategory === "all" ? "No memories found" : `No memories found in ${filterCategory} category`}
            </div>
          ) : (
            filteredMemories.map((memory) => (
              <Card key={memory.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  {editingMemory?.id === memory.id ? (
                    // Edit form
                    <div className="space-y-4">
                      <Textarea
                        value={editingMemory.content}
                        onChange={(e) => setEditingMemory({ ...editingMemory, content: e.target.value })}
                        rows={3}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <Select 
                          value={editingMemory.category} 
                          onValueChange={(value) => setEditingMemory({ ...editingMemory, category: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.keys(categoryColors).map(cat => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          min="1"
                          max="10"
                          value={editingMemory.importance_score}
                          onChange={(e) => setEditingMemory({ ...editingMemory, importance_score: parseInt(e.target.value) })}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => updateMemory(memory.id, {
                          content: editingMemory.content,
                          category: editingMemory.category,
                          importance_score: editingMemory.importance_score
                        })}>
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingMemory(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // Display mode
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm leading-relaxed">{memory.content}</p>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setEditingMemory(memory)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => deleteMemory(memory.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 items-center">
                        <Badge className={categoryColors[memory.category as keyof typeof categoryColors] || categoryColors.general}>
                          {memory.category}
                        </Badge>
                        
                        <div className={`flex items-center gap-1 text-sm ${importanceColors[getImportanceLevel(memory.importance_score)]}`}>
                          <Star className="h-3 w-3" />
                          {memory.importance_score}/10
                        </div>

                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(memory.last_accessed).toLocaleDateString()}
                        </div>

                        <Badge variant="secondary">
                          {memory.access_count} access{memory.access_count !== 1 ? 'es' : ''}
                        </Badge>

                        <Badge variant="outline">
                          {memory.source_type}
                        </Badge>
                      </div>

                      {memory.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {memory.keywords.slice(0, 5).map((keyword, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {memory.source_message && (
                        <details className="text-xs text-muted-foreground">
                          <summary className="cursor-pointer hover:text-foreground">
                            Source message
                          </summary>
                          <p className="mt-1 italic">"{memory.source_message}"</p>
                        </details>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
