<!-- CategoriesView.vue -->
<template>
  <div>
    <div class="flex items-center justify-between mb-6"><h1 class="font-serif text-2xl">Categories 📂</h1><button @click="showForm=true" class="btn btn-primary btn-sm">+ New Category</button></div>
    <div class="card overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 border-b"><tr><th class="text-left px-4 py-3 text-xs font-bold uppercase text-gray-400">Category</th><th class="text-left px-4 py-3 text-xs font-bold uppercase text-gray-400">Slug</th><th class="text-left px-4 py-3 text-xs font-bold uppercase text-gray-400">Status</th><th class="px-4 py-3"></th></tr></thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-for="c in categories" :key="c._id" class="hover:bg-gray-50">
            <td class="px-4 py-3 font-medium">{{ c.emoji }} {{ c.name }}</td>
            <td class="px-4 py-3 text-gray-400 text-xs">{{ c.slug }}</td>
            <td class="px-4 py-3"><button @click="toggle(c)" :class="['text-xs font-semibold px-2.5 py-1 rounded-full', c.isActive?'bg-green/10 text-green':'bg-red-100 text-red-600']">{{ c.isActive?'Active':'Inactive' }}</button></td>
            <td class="px-4 py-3 flex gap-2">
              <button @click="edit(c)" class="text-green hover:underline text-xs">Edit</button>
              <button @click="remove(c._id)" class="text-red-400 hover:text-red-600 text-xs">Delete</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-if="showForm" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4">
        <h3 class="font-semibold">{{ editingId ? 'Edit Category' : 'New Category' }}</h3>
        <div><label class="form-label">Name *</label><input v-model="nf.name" class="form-input" placeholder="Mangoes"/></div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="form-label">Slug *</label><input v-model="nf.slug" class="form-input" placeholder="mangoes"/></div>
          <div><label class="form-label">Emoji</label><input v-model="nf.emoji" class="form-input" placeholder="🥭"/></div>
        </div>
        <label class="flex items-center gap-2 text-sm"><input v-model="nf.isActive" type="checkbox" class="accent-green"/> Active</label>
        <div class="flex gap-3"><button @click="showForm=false" class="btn btn-ghost flex-1 btn-sm">Cancel</button><button @click="createOrUpdate" class="btn btn-primary flex-1 btn-sm">{{ editingId ? 'Save' : 'Create' }}</button></div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue'
import api from '@/lib/api.js'
const categories = ref([]); const showForm = ref(false)
const editingId = ref('')
const nf = ref({ name:'',slug:'',emoji:'🥭',isActive:true,sortOrder:0 })
const load   = async () => { const {data}=await api.get('/admin/categories'); categories.value=data.categories }
const toggle = async (c) => { await api.patch(`/admin/categories/${c._id}`,{isActive:!c.isActive}); c.isActive=!c.isActive }
const remove = async (id) => { if(confirm('Delete category?')) { await api.delete(`/admin/categories/${id}`); await load() } }
const edit = (c) => { editingId.value = c._id; nf.value = { name:c.name, slug:c.slug, emoji:c.emoji, isActive:c.isActive, sortOrder:c.sortOrder || 0 }; showForm.value = true }
const createOrUpdate = async () => {
  if (editingId.value) await api.put(`/admin/categories/${editingId.value}`, nf.value)
  else await api.post('/admin/categories',nf.value)
  showForm.value=false; editingId.value=''; nf.value={ name:'',slug:'',emoji:'🥭',isActive:true,sortOrder:0 }; await load()
}
onMounted(load)
</script>
