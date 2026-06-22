import { nsClient } from './ns_service';

async function checkCatalog() {
    try {
        console.log("🚀 Запрашиваем каталог товаров... (это может занять 10-20 секунд)");
        
        const stock = await nsClient.call("GET", "/api/v2/stock");

        if (stock && stock.categories) {
            console.log(`✅ Каталог получен! Категорий: ${stock.categories.length}`);
            console.log("--------------------------------------------------");

            const keywords = ['steam', 'playstation', 'psn', 'sony'];

            stock.categories.forEach((cat: any) => {
                const name = cat.category_name.toLowerCase();
                
                // Фильтруем только Steam и PlayStation
                if (keywords.some(kw => name.includes(kw))) {
                    console.log(`\n📂 [ID: ${cat.category_id}] ${cat.category_name}`);
                    
                    // Показываем, какие поля нужны для заказа (account/amount или quantity)
                    console.log(`📝 Поля для заказа: ${cat.fields.map((f: any) => f.key).join(', ')}`);

                    cat.services.forEach((svc: any) => {
                        console.log(`   - 💎 ID: ${svc.service_id} | ${svc.service_name} | Цена: ${svc.price} ${svc.currency}`);
                    });
                }
            });
            console.log("\n--------------------------------------------------");
            console.log("🚀 Выпиши нужные service_id и переходи к интеграции в бота.");
        }
    } catch (e: any) {
        console.error("❌ Ошибка при получении стока:", e.response?.data || e.message);
    }
}

checkCatalog();