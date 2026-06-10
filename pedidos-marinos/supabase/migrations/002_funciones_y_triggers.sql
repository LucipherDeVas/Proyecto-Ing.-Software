-- Automatizaciones que no duplican la suma de deuda realizada actualmente
-- por src/services/pedidosService.js.

BEGIN;

CREATE OR REPLACE FUNCTION public.establecer_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_clientes_updated_at ON public.clientes;
CREATE TRIGGER tr_clientes_updated_at
BEFORE UPDATE ON public.clientes
FOR EACH ROW
EXECUTE FUNCTION public.establecer_updated_at();

DROP TRIGGER IF EXISTS tr_productos_updated_at ON public.productos;
CREATE TRIGGER tr_productos_updated_at
BEFORE UPDATE ON public.productos
FOR EACH ROW
EXECUTE FUNCTION public.establecer_updated_at();

DROP TRIGGER IF EXISTS tr_pedidos_updated_at ON public.pedidos;
CREATE TRIGGER tr_pedidos_updated_at
BEFORE UPDATE ON public.pedidos
FOR EACH ROW
EXECUTE FUNCTION public.establecer_updated_at();

CREATE OR REPLACE FUNCTION public.sincronizar_pago_y_deuda()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.estado = 'pendiente' AND NEW.estado <> 'pendiente' THEN
      UPDATE public.clientes
      SET deuda_actual = GREATEST(deuda_actual - OLD.total, 0)
      WHERE id = OLD.cliente_id;
    ELSIF OLD.estado <> 'pendiente' AND NEW.estado = 'pendiente' THEN
      UPDATE public.clientes
      SET deuda_actual = deuda_actual + NEW.total
      WHERE id = NEW.cliente_id;
    END IF;

    IF OLD.estado <> 'pagado' AND NEW.estado = 'pagado' THEN
      NEW.fecha_pago := COALESCE(NEW.fecha_pago, now());
    ELSIF OLD.estado = 'pagado' AND NEW.estado <> 'pagado' THEN
      NEW.fecha_pago := NULL;
    END IF;

    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.estado = 'pendiente' THEN
      UPDATE public.clientes
      SET deuda_actual = GREATEST(deuda_actual - OLD.total, 0)
      WHERE id = OLD.cliente_id;
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS tr_sincronizar_pago_y_deuda ON public.pedidos;
CREATE TRIGGER tr_sincronizar_pago_y_deuda
BEFORE UPDATE OF estado OR DELETE ON public.pedidos
FOR EACH ROW
EXECUTE FUNCTION public.sincronizar_pago_y_deuda();

COMMIT;
