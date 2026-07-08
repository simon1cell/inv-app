import { emojiFor, type Order } from "@/types/inventory";

type OrdersPageProps = {
  orders: Order[];
  history: Order[];
  onLogOrder: () => void;
};

function OrderTable({
  title,
  subtitle,
  orders,
}: {
  title: string;
  subtitle: string;
  orders: Order[];
}) {
  return (
    <div className="card">
      <div className="card-head">
        <div>
          <h2>{title}</h2>
          <p className="sub">{subtitle}</p>
        </div>
      </div>

      <div className="toolbar">
        <div />
        <div className="search">
          <span className="search-icon">⌕</span>
          <input placeholder="Search" />
        </div>
      </div>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Date Ordered ↓</th>
              <th>Item Name</th>
              <th>Price</th>
              <th>Catalog Number</th>
              <th>Units Ordered</th>
              <th>Expiry Date</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td className="strong-text">{order.dateOrdered}</td>

                <td>
                  <div className="item-cell">
                    <div className="thumb">{emojiFor(order.itemName)}</div>
                    <div>
                      <div className="nm">{order.itemName}</div>
                      <div className="sub">{order.supplier}</div>
                    </div>
                  </div>
                </td>

                <td>
                  <div className="two-line">
                    <b>${order.totalPrice} USD</b>
                    <span>${order.pricePerUnit} per unit</span>
                  </div>
                </td>

                <td>{order.catalogueNum}</td>
                <td>{order.unitsOrdered}</td>
                <td>{order.expiryDate}</td>

                <td>
                  {order.delivered ? (
                    <div className="delivered-status">
                      <span className="toggle-wrap on">
                        <span className="toggle" />
                      </span>

                      <div className="two-line">
                        <b>Delivered</b>
                        <span>{order.dateDelivered}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="delivered-status">
                      <span className="toggle-wrap">
                        <span className="toggle" />
                      </span>
                      <span>Not Delivered</span>
                    </div>
                  )}
                </td>
              </tr>
            ))}

            {orders.length === 0 && (
              <tr>
                <td colSpan={7} className="empty-row">
                  No orders found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function OrdersPage({
  orders,
  history,
  onLogOrder,
}: OrdersPageProps) {
  return (
    <section className="view active">
      <p className="section-tag">ORDERS</p>

      <div className="card">
        <div className="card-head">
          <div>
            <h2>Pending Orders</h2>
            <p className="sub">
              Displaying <b>{orders.length} items</b> at 1Cell.AI
            </p>
          </div>

          <button type="button" className="btn primary" onClick={onLogOrder}>
            + Log Order
          </button>
        </div>
      </div>

      <OrderTable
        title="Pending Order List"
        subtitle="Orders that have not been delivered yet"
        orders={orders}
      />

      <OrderTable
        title="Order History"
        subtitle={`Displaying ${history.length} delivered orders`}
        orders={history}
      />
    </section>
  );
}