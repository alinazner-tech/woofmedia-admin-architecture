// Коли лежить сам шлюз, деградувати частинами неможливо:
// жоден запит не проходить. Але статична оболонка з CDN показує зрозумілий
// екран і сама повторює спробу — не білий екран (Б-7м).

export function GatewayDownPage({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="page page--center" role="alert">
      <h1>Панель тимчасово недоступна</h1>
      <p className="muted">Не вдається звʼязатися з сервером. Повторюємо спробу кожні 30 секунд.</p>
      <button type="button" className="btn" onClick={onRetry}>
        Спробувати зараз
      </button>
    </div>
  );
}
