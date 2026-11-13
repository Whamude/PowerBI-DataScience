package br.com.marmitafacil.app;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.text.ParsePosition;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/** Money is always stored in integer centavos, never floating point. */
public final class Rules {
    public static final long MAX_PRICE = 100000000L;
    public static final long MAX_TOTAL = 1000000000000L;
    public static final int MAX_QUANTITY = 10000;
    private static final Locale BR = new Locale("pt", "BR");
    private Rules() {}

    public static long parseMoney(String raw) {
        String s = raw.trim().replace("R$", "").replace("\u00a0", "").replace(" ", "");
        if (s.isEmpty()) throw new IllegalArgumentException("Informe o valor da marmita.");
        if (s.contains(",")) {
            if (!s.matches("(?:[0-9]+|[0-9]{1,3}(?:\\.[0-9]{3})+),[0-9]{1,2}"))
                throw new IllegalArgumentException("Use um valor como 20,00.");
            s = s.replace(".", "").replace(',', '.');
        } else if (!s.matches("[0-9]+(?:\\.[0-9]{1,2})?")) {
            throw new IllegalArgumentException("Use um valor como 20,00.");
        }
        try {
            long value = new BigDecimal(s).movePointRight(2).longValueExact();
            if (value <= 0 || value > MAX_PRICE)
                throw new IllegalArgumentException("O valor deve ser maior que zero e até R$ 1.000.000,00.");
            return value;
        } catch (ArithmeticException e) {
            throw new IllegalArgumentException("Valor inválido.");
        }
    }

    public static int parseQuantity(String raw) {
        try {
            if (!raw.trim().matches("[0-9]{1,5}")) throw new NumberFormatException();
            int q = Integer.parseInt(raw.trim());
            if (q < 1 || q > MAX_QUANTITY) throw new NumberFormatException();
            return q;
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("A quantidade deve ser de 1 a 10.000.");
        }
    }

    public static long lineTotal(long price, int quantity) {
        if (price <= 0 || price > MAX_PRICE || quantity < 1 || quantity > MAX_QUANTITY)
            throw new IllegalArgumentException("Preço ou quantidade inválidos.");
        return price * quantity;
    }

    public static long addTotal(long total, long value) {
        if (value < 0 || total < 0 || total > MAX_TOTAL - value)
            throw new IllegalArgumentException("O valor total do pedido excede o limite permitido.");
        return total + value;
    }

    public static String money(long value) {
        return NumberFormat.getCurrencyInstance(BR).format(BigDecimal.valueOf(value, 2));
    }

    public static String priceInput(long value) {
        return BigDecimal.valueOf(value, 2).toPlainString().replace('.', ',');
    }

    public static String today() {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
    }

    public static boolean validDate(String date) {
        if (date == null || !date.matches("[0-9]{4}-[0-9]{2}-[0-9]{2}")) return false;
        SimpleDateFormat f = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
        f.setLenient(false);
        ParsePosition position = new ParsePosition(0);
        Date parsed = f.parse(date, position);
        return parsed != null && position.getIndex() == date.length()
            && date.compareTo("1900-01-01") >= 0 && date.compareTo("2100-12-31") <= 0;
    }

    public static void dates(String ordered, String delivery) {
        if (!validDate(ordered) || !validDate(delivery)) throw new IllegalArgumentException("Data inválida.");
        if (delivery.compareTo(ordered) < 0)
            throw new IllegalArgumentException("A entrega não pode ser anterior ao pedido.");
    }

    public static String date(String iso) {
        return iso.substring(8, 10) + "/" + iso.substring(5, 7) + "/" + iso.substring(0, 4);
    }

    public static String text(String value, String field, int max, boolean required) {
        String s = value == null ? "" : value.trim();
        if (required && s.isEmpty()) throw new IllegalArgumentException("Informe " + field + ".");
        if (s.length() > max) throw new IllegalArgumentException(field + ": use até " + max + " caracteres.");
        return s;
    }

    public static boolean validStatus(String status) {
        return "pending".equals(status) || "delivered".equals(status) || "cancelled".equals(status);
    }

    public static String statusLabel(String status) {
        if ("delivered".equals(status)) return "Entregue";
        if ("cancelled".equals(status)) return "Cancelado";
        return "A entregar";
    }
}
