import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/index.js'

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: () => ({ top: 0, behavior: 'smooth' }),
  routes: [
    // ── PUBLIC ──────────────────────────────────────────────
    { path: '/',         name: 'Home',     component: () => import('@/views/HomeView.vue') },
    { path: '/shop',     name: 'Shop',     component: () => import('@/views/ShopView.vue') },
    { path: '/product/:slug', name: 'Product', component: () => import('@/views/ProductView.vue') },
    { path: '/cart',     name: 'Cart',     component: () => import('@/views/CartView.vue') },
    { path: '/track',    name: 'Track',    component: () => import('@/views/TrackView.vue') },
    { path: '/about',    name: 'About',    component: () => import('@/views/AboutView.vue') },
    { path: '/contact',  name: 'Contact',  component: () => import('@/views/ContactView.vue') },
    { path: '/faq',      name: 'FAQ',      component: () => import('@/views/FaqView.vue') },
    { path: '/bulk',     name: 'Bulk',     component: () => import('@/views/BulkView.vue') },
    { path: '/terms',    name: 'Terms',    component: () => import('@/views/TermsView.vue') },
    { path: '/privacy',  name: 'Privacy',  component: () => import('@/views/PrivacyView.vue') },
    { path: '/returns',  name: 'Returns',  component: () => import('@/views/ReturnsView.vue') },
    { path: '/complaint',name: 'Complaint',component: () => import('@/views/ComplaintView.vue') },

    // ── AUTH ──────────────────────────────────────────────
    { path: '/login',    name: 'Login',    component: () => import('@/views/LoginView.vue'),    meta: { guestOnly: true } },
    { path: '/register', name: 'Register', component: () => import('@/views/LoginView.vue'),    meta: { guestOnly: true } },

    // ── CUSTOMER (protected) ──────────────────────────────
    { path: '/checkout',         name: 'Checkout',        component: () => import('@/views/CheckoutView.vue'),        meta: { requiresAuth: true } },
    { path: '/checkout/success', name: 'CheckoutSuccess', component: () => import('@/views/CheckoutSuccessView.vue'), meta: { requiresAuth: true } },
    { path: '/account',          name: 'Account',         component: () => import('@/views/AccountView.vue'),          meta: { requiresAuth: true } },
    { path: '/account/orders/:id', name: 'OrderDetail',  component: () => import('@/views/OrderDetailView.vue'),      meta: { requiresAuth: true } },

    // ── ADMIN ─────────────────────────────────────────────
    { path: '/admin/login', name: 'AdminLogin', component: () => import('@/views/admin/AdminLoginView.vue'), meta: { guestOnly: true } },
    {
      path: '/admin',
      component: () => import('@/views/admin/AdminLayout.vue'),
      meta: { requiresAuth: true, requiresAdmin: true },
      children: [
        { path: '',             name: 'AdminDashboard',   component: () => import('@/views/admin/DashboardView.vue') },
        { path: 'products',     name: 'AdminProducts',    component: () => import('@/views/admin/ProductsView.vue') },
        { path: 'products/new', name: 'AdminProductNew',  component: () => import('@/views/admin/ProductFormView.vue') },
        { path: 'products/:id', name: 'AdminProductEdit', component: () => import('@/views/admin/ProductFormView.vue') },
        { path: 'orders',       name: 'AdminOrders',      component: () => import('@/views/admin/OrdersView.vue') },
        { path: 'orders/:id',   name: 'AdminOrderDetail', component: () => import('@/views/admin/OrderDetailView.vue') },
        { path: 'customers',    name: 'AdminCustomers',   component: () => import('@/views/admin/CustomersView.vue') },
        { path: 'coupons',      name: 'AdminCoupons',     component: () => import('@/views/admin/CouponsView.vue') },
        { path: 'categories',   name: 'AdminCategories',  component: () => import('@/views/admin/CategoriesView.vue') },
        { path: 'pincodes',     name: 'AdminPincodes',    component: () => import('@/views/admin/PincodesView.vue') },
        { path: 'complaints',   name: 'AdminComplaints',  component: () => import('@/views/admin/ComplaintsView.vue') },
        { path: 'bulk',         name: 'AdminBulk',        component: () => import('@/views/admin/BulkEnquiriesView.vue') },
        { path: 'hours',        name: 'AdminHours',       component: () => import('@/views/admin/BusinessHoursView.vue') },
        { path: 'stock-logs',   name: 'AdminStockLogs',   component: () => import('@/views/admin/StockLogsView.vue') },
      ]
    },

    // ── 404 ───────────────────────────────────────────────
    { path: '/:pathMatch(.*)*', name: 'NotFound', component: () => import('@/views/NotFoundView.vue') }
  ]
})

router.beforeEach(async (to, from, next) => {
  const auth = useAuthStore()
  const needsAuth = to.meta.requiresAuth || to.meta.requiresAdmin

  if (needsAuth && !auth.user && !auth.loading) {
    await auth.fetchMe()
  }

  if (to.meta.requiresAdmin && !auth.isAdmin) {
    return next('/admin/login')
  }
  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return next({ name: 'Login', query: { redirect: to.fullPath } })
  }
  if (to.meta.guestOnly && auth.isLoggedIn) {
    return next(auth.isAdmin ? '/admin' : '/')
  }
  next()
})

export default router
