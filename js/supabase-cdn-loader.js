// Supabase CDN Loader
// 여러 CDN을 시도하여 Supabase SDK 로드

(function loadSupabase() {
    const cdns = [
        'https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.js',
        'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js',
        'https://cdn.skypack.dev/@supabase/supabase-js@2'
    ];
    
    let currentIndex = 0;
    
    function tryLoadCDN(index) {
        if (index >= cdns.length) {
            console.error('[Supabase CDN Loader] 모든 CDN에서 로드 실패');
            return;
        }
        
        console.log('[Supabase CDN Loader] 시도 중:', cdns[index]);
        
        const script = document.createElement('script');
        script.src = cdns[index];
        
        script.onload = function() {
            console.log('[Supabase CDN Loader] 로드 성공:', cdns[index]);
            initSupabaseClient();
        };
        
        script.onerror = function() {
            console.warn('[Supabase CDN Loader] 로드 실패:', cdns[index]);
            tryLoadCDN(index + 1);
        };
        
        document.head.appendChild(script);
    }
    
    function initSupabaseClient() {
        setTimeout(function() {
            if (!window.supabase) {
                console.error('[Supabase CDN Loader] window.supabase가 없습니다');
                return;
            }
            
            try {
                const PROJECT_URL = 'https://ojlsrvcrwvdohynjplmw.supabase.co';
                const ANON_PUBLIC_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qbHNydmNyd3Zkb2h5bmpwbG13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3MjI3MjgsImV4cCI6MjA4MDI5ODcyOH0.I9eNNGf5cwpZFbE8vxv75cnv2QQRTckFO7QCE8to0rA';

                const client = window.supabase.createClient(PROJECT_URL, ANON_PUBLIC_KEY, {
                    autoRefreshToken: true,
                    persistSession: true,
                    detectSessionInUrl: true,
                });

                window.supabaseClient = client;
                console.log('[Supabase CDN Loader] ✅ Supabase client 초기화 완료!');
                
                // 연결 테스트
                client.from('groups').select('count')
                    .then(function(result) {
                        if (result.error) {
                            console.error('[Supabase CDN Loader] ❌ DB 연결 실패:', result.error);
                        } else {
                            console.log('[Supabase CDN Loader] ✅ DB 연결 성공!');
                        }
                    });
            } catch (err) {
                console.error('[Supabase CDN Loader] 초기화 오류:', err);
            }
        }, 100);
    }
    
    // 로드 시작
    tryLoadCDN(0);
})();

