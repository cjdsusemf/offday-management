// Supabase 클라이언트 초기화
// 공개 anon 키만 사용합니다. 민감한 작업은 서버 사이드에서 수행하세요.

(function initSupabase() {
	try {
		if (!window.supabase) {
			console.warn('[supabase-init] Supabase SDK가 로드되지 않았습니다. CDN 스크립트를 확인하세요.');
			return;
		}

	const PROJECT_URL = 'https://ojlsrvcrwvdohynjplmw.supabase.co';
	const ANON_PUBLIC_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qbHNydmNyd3Zkb2h5bmpwbG13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3MjI3MjgsImV4cCI6MjA4MDI5ODcyOH0.I9eNNGf5cwpZFbE8vxv75cnv2QQRTckFO7QCE8to0rA';

		const client = window.supabase.createClient(PROJECT_URL, ANON_PUBLIC_KEY, {
			autoRefreshToken: true,
			persistSession: true,
			detectSessionInUrl: true,
		});

		window.supabaseClient = client;
		console.log('[supabase-init] Supabase client initialized');
	} catch (err) {
		console.error('[supabase-init] 초기화 오류:', err);
	}
})();


