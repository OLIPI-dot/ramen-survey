const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://ssmkasmtdnojdicdpdfg.supabase.co', 'sb_publishable_KUDrpaeQ58xmKIo59ldZzQ_6qTg_NZX');

async function run() {
    console.log('Starting...');
    const dl = new Date();
    dl.setDate(dl.getDate() + 7);

    const { data, error } = await supabase.from('surveys').insert([
        {
            title: 'うさぎのラビの挑戦！🥕 みんなの『元気が出る魔法』はどれ？🐰🌈',
            category: 'その他',
            user_id: '6234165b-cbf3-4a78-95d9-794400341270',
            deadline: dl.toISOString(),
            visibility: 'public',
            tags: ['ラビ', '元気', '魔法', 'アンケート広場']
        }
    ]).select('id');

    if (error) {
        console.error('Insert Error:', error);
        process.exit(1);
    }

    const sId = data[0].id;
    console.log('Survey created with ID:', sId);

    const options = [
        '美味しいものを食べる 🍰',
        '好きな音楽を聴く 🎵',
        '誰かに褒めてもらう 👏',
        '太陽の光を浴びる ☀️',
        'ラビとニンジンを分かち合う 🐰🥕'
    ];

    const { error: oError } = await supabase.from('options').insert(
        options.map(name => ({ name, votes: 0, survey_id: sId }))
    );

    if (oError) {
        console.error('Options error:', oError);
        process.exit(1);
    }

    console.log('Successfully created Labis survey!');
    process.exit(0);
}

run();
