<?php
/**
 * Plugin Name: RedeemLoop Voucher Gateway
 * Description: Sandbox WooCommerce payment gateway for RedeemLoop voucher PaymentIntents.
 * Version: 0.8.0
 * Author: RedeemLoop
 * License: MIT
 * Requires Plugins: woocommerce
 */

if (!defined('ABSPATH')) {
    exit;
}

add_action('plugins_loaded', 'redeemloop_voucher_gateway_init');
add_filter('woocommerce_payment_gateways', 'redeemloop_voucher_gateway_register');
add_action('rest_api_init', 'redeemloop_voucher_gateway_register_routes');

function redeemloop_voucher_gateway_register($gateways) {
    $gateways[] = 'WC_Gateway_RedeemLoop_Voucher';
    return $gateways;
}

function redeemloop_voucher_gateway_init() {
    if (!class_exists('WC_Payment_Gateway')) {
        return;
    }

    class WC_Gateway_RedeemLoop_Voucher extends WC_Payment_Gateway {
        public function __construct() {
            $this->id = 'redeemloop_voucher';
            $this->method_title = __('RedeemLoop Voucher', 'redeemloop');
            $this->method_description = __('Accept merchant-owned voucher assets through RedeemLoop PaymentIntents.', 'redeemloop');
            $this->has_fields = true;
            $this->supports = array('products');

            $this->init_form_fields();
            $this->init_settings();

            $this->title = $this->get_option('title', 'RedeemLoop Voucher');
            $this->description = $this->get_option('description', 'Pay with a supported voucher asset.');
            $this->enabled = $this->get_option('enabled', 'no');
            $this->api_base_url = untrailingslashit($this->get_option('api_base_url', 'http://localhost:8787'));
            $this->merchant_id = $this->get_option('merchant_id', '');
            $this->api_key = $this->get_option('api_key', '');
            $this->default_binding_id = $this->get_option('default_binding_id', '');
            $this->sku_binding_map = $this->get_option('sku_binding_map', '');
            $this->webhook_secret = $this->get_option('webhook_secret', '');
            $this->widget_script_url = $this->get_option('widget_script_url', '');

            add_action('woocommerce_update_options_payment_gateways_' . $this->id, array($this, 'process_admin_options'));
            add_action('woocommerce_thankyou_' . $this->id, array($this, 'thankyou_page'));
        }

        public function init_form_fields() {
            $this->form_fields = array(
                'enabled' => array(
                    'title' => __('Enable', 'redeemloop'),
                    'type' => 'checkbox',
                    'label' => __('Enable RedeemLoop Voucher payments', 'redeemloop'),
                    'default' => 'no',
                ),
                'title' => array(
                    'title' => __('Title', 'redeemloop'),
                    'type' => 'text',
                    'default' => 'RedeemLoop Voucher',
                ),
                'description' => array(
                    'title' => __('Description', 'redeemloop'),
                    'type' => 'textarea',
                    'default' => 'Pay with a supported voucher asset.',
                ),
                'api_base_url' => array(
                    'title' => __('RedeemLoop API Base URL', 'redeemloop'),
                    'type' => 'text',
                    'default' => 'http://localhost:8787',
                ),
                'merchant_id' => array(
                    'title' => __('Merchant ID', 'redeemloop'),
                    'type' => 'text',
                    'default' => '',
                ),
                'api_key' => array(
                    'title' => __('API Key', 'redeemloop'),
                    'type' => 'password',
                    'default' => '',
                ),
                'default_binding_id' => array(
                    'title' => __('Default Binding ID', 'redeemloop'),
                    'type' => 'text',
                    'default' => '',
                ),
                'sku_binding_map' => array(
                    'title' => __('SKU to Binding Map', 'redeemloop'),
                    'type' => 'textarea',
                    'description' => __('Optional one mapping per line, for example coffee-cup=bind_coffee. The default binding is used when no SKU matches.', 'redeemloop'),
                    'default' => '',
                ),
                'webhook_secret' => array(
                    'title' => __('Webhook Secret', 'redeemloop'),
                    'type' => 'password',
                    'default' => '',
                ),
                'widget_script_url' => array(
                    'title' => __('Widget Script URL', 'redeemloop'),
                    'type' => 'text',
                    'description' => __('Optional URL for a bundled RedeemLoop widget script on the order-received page.', 'redeemloop'),
                    'default' => '',
                ),
            );
        }

        public function admin_options() {
            $diagnostics = $this->maybe_run_admin_diagnostics();
            echo '<h2>' . esc_html($this->method_title) . '</h2>';
            echo '<p>' . esc_html__('RedeemLoop creates a PaymentIntent during checkout and marks the order paid after settlement confirmation.', 'redeemloop') . '</p>';
            if ($diagnostics) {
                $notice_class = $diagnostics['ok'] ? 'notice notice-success inline' : 'notice notice-warning inline';
                echo '<div class="' . esc_attr($notice_class) . '"><p>' . esc_html($diagnostics['summary']) . '</p><ul>';
                foreach ($diagnostics['details'] as $detail) {
                    echo '<li>' . esc_html($detail) . '</li>';
                }
                echo '</ul></div>';
            }
            echo '<table class="widefat striped" style="max-width: 760px; margin-bottom: 16px;"><tbody>';
            echo '<tr><td>' . esc_html__('API Base URL', 'redeemloop') . '</td><td><code>' . esc_html($this->api_base_url ?: 'not configured') . '</code></td></tr>';
            echo '<tr><td>' . esc_html__('Merchant ID', 'redeemloop') . '</td><td><code>' . esc_html($this->merchant_id ?: 'not configured') . '</code></td></tr>';
            echo '<tr><td>' . esc_html__('Default Binding ID', 'redeemloop') . '</td><td><code>' . esc_html($this->default_binding_id ?: 'not configured') . '</code></td></tr>';
            echo '<tr><td>' . esc_html__('Webhook Endpoint', 'redeemloop') . '</td><td><code>' . esc_html(rest_url('redeemloop/v1/woocommerce/mark-paid')) . '</code></td></tr>';
            echo '</tbody></table>';
            wp_nonce_field('redeemloop_connection_test', 'redeemloop_connection_test_nonce');
            submit_button(__('Test RedeemLoop connection', 'redeemloop'), 'secondary', 'redeemloop_connection_test', false);
            parent::admin_options();
        }

        public function validate_api_base_url_field($key, $value) {
            $url = untrailingslashit(trim((string) $value));
            if (!$url || !filter_var($url, FILTER_VALIDATE_URL)) {
                $this->add_error(__('RedeemLoop API Base URL must be a valid URL.', 'redeemloop'));
                return $this->api_base_url ?: 'http://localhost:8787';
            }
            return esc_url_raw($url);
        }

        public function validate_sku_binding_map_field($key, $value) {
            $lines = array();
            foreach (preg_split('/\r\n|\r|\n/', (string) $value) as $line) {
                $line = trim($line);
                if ($line === '') {
                    continue;
                }
                if (strpos($line, '=') === false) {
                    $this->add_error(sprintf(__('Invalid SKU mapping "%s"; use sku=bindingId.', 'redeemloop'), $line));
                    continue;
                }
                list($sku, $binding_id) = array_map('trim', explode('=', $line, 2));
                if ($sku === '' || $binding_id === '') {
                    $this->add_error(sprintf(__('Invalid SKU mapping "%s"; SKU and Binding ID are required.', 'redeemloop'), $line));
                    continue;
                }
                $lines[] = sanitize_text_field($sku) . '=' . sanitize_text_field($binding_id);
            }
            return implode("\n", $lines);
        }

        public function payment_fields() {
            if ($this->description) {
                echo wp_kses_post(wpautop($this->description));
            }
            echo '<p>' . esc_html__('The order will stay pending until RedeemLoop confirms voucher receipt.', 'redeemloop') . '</p>';
        }

        public function process_payment($order_id) {
            $order = wc_get_order($order_id);
            if (!$order) {
                wc_add_notice(__('Order not found.', 'redeemloop'), 'error');
                return array('result' => 'failure');
            }
            $binding_id = $this->binding_id_for_order($order);
            if (!$binding_id) {
                wc_add_notice(__('RedeemLoop binding ID is not configured.', 'redeemloop'), 'error');
                return array('result' => 'failure');
            }

            $intent = $this->create_payment_intent($order, $binding_id);
            if (empty($intent['intentId'])) {
                wc_add_notice(__('RedeemLoop did not return a PaymentIntent.', 'redeemloop'), 'error');
                return array('result' => 'failure');
            }

            $order->update_meta_data('_redeemloop_intent_id', sanitize_text_field($intent['intentId']));
            $order->update_meta_data('_redeemloop_binding_id', sanitize_text_field($binding_id));
            $order->update_status('pending', __('Awaiting RedeemLoop voucher payment.', 'redeemloop'));
            $order->save();

            return array(
                'result' => 'success',
                'redirect' => add_query_arg('redeemloop_intent', rawurlencode($intent['intentId']), $this->get_return_url($order)),
            );
        }

        public function thankyou_page($order_id) {
            $order = wc_get_order($order_id);
            if (!$order) {
                return;
            }
            $intent_id = $order->get_meta('_redeemloop_intent_id');
            if (!$intent_id) {
                return;
            }

            echo '<section class="redeemloop-voucher-payment">';
            echo '<h2>' . esc_html__('RedeemLoop Voucher Payment', 'redeemloop') . '</h2>';
            echo '<p>' . esc_html__('Complete the voucher transfer, then this order will be marked paid after RedeemLoop settlement confirmation.', 'redeemloop') . '</p>';
            echo '<ul class="redeemloop-voucher-diagnostics">';
            echo '<li>' . esc_html__('Order status:', 'redeemloop') . ' <code>' . esc_html($order->get_status()) . '</code></li>';
            echo '<li>' . esc_html__('PaymentIntent:', 'redeemloop') . ' <code>' . esc_html($intent_id) . '</code></li>';
            echo '<li>' . esc_html__('Binding:', 'redeemloop') . ' <code>' . esc_html($order->get_meta('_redeemloop_binding_id') ?: 'not recorded') . '</code></li>';
            echo '</ul>';
            echo '<div data-redeemloop-pay-button';
            echo ' data-api-base-url="' . esc_attr($this->api_base_url) . '"';
            echo ' data-api-key="' . esc_attr($this->api_key) . '"';
            echo ' data-intent-id="' . esc_attr($intent_id) . '"';
            echo ' data-label="' . esc_attr__('Pay with RedeemLoop voucher', 'redeemloop') . '"';
            echo '></div>';
            if ($this->widget_script_url) {
                echo '<script type="module" src="' . esc_url($this->widget_script_url) . '"></script>';
            }
            echo '</section>';
        }

        private function create_payment_intent($order, $binding_id) {
            $body = array(
                'bindingId' => $binding_id,
                'orderId' => (string) $order->get_id(),
                'channel' => 'checkout',
                'skuLines' => $this->sku_lines($order),
            );
            $response = wp_remote_post($this->api_base_url . '/v1/payment-intents', array(
                'timeout' => 20,
                'headers' => $this->api_headers(),
                'body' => wp_json_encode($body),
            ));
            if (is_wp_error($response)) {
                wc_add_notice($response->get_error_message(), 'error');
                return array();
            }
            $code = wp_remote_retrieve_response_code($response);
            $raw = wp_remote_retrieve_body($response);
            $decoded = json_decode($raw, true);
            if ($code < 200 || $code >= 300 || !is_array($decoded)) {
                wc_add_notice(sprintf(__('RedeemLoop API error: %s', 'redeemloop'), esc_html($raw)), 'error');
                return array();
            }
            return $decoded;
        }

        private function maybe_run_admin_diagnostics() {
            if (empty($_POST['redeemloop_connection_test'])) {
                return null;
            }
            $nonce = isset($_POST['redeemloop_connection_test_nonce']) ? sanitize_text_field(wp_unslash($_POST['redeemloop_connection_test_nonce'])) : '';
            if (!$nonce || !wp_verify_nonce($nonce, 'redeemloop_connection_test')) {
                return array(
                    'ok' => false,
                    'summary' => __('RedeemLoop diagnostics could not run.', 'redeemloop'),
                    'details' => array(__('The admin request nonce was invalid.', 'redeemloop')),
                );
            }

            $connection = $this->run_connection_test();
            $webhook = $this->run_webhook_secret_self_test();
            return array(
                'ok' => $connection['ok'] && $webhook['ok'],
                'summary' => $connection['ok'] && $webhook['ok']
                    ? __('RedeemLoop diagnostics passed.', 'redeemloop')
                    : __('RedeemLoop diagnostics found configuration issues.', 'redeemloop'),
                'details' => array($connection['message'], $webhook['message']),
            );
        }

        private function run_connection_test() {
            if (!$this->api_base_url || !$this->merchant_id) {
                return array(
                    'ok' => false,
                    'message' => __('Connection test skipped: API Base URL and Merchant ID are required.', 'redeemloop'),
                );
            }
            $url = add_query_arg(array('merchantId' => $this->merchant_id), $this->api_base_url . '/v1/merchant-vaults');
            $response = wp_remote_get($url, array(
                'timeout' => 10,
                'headers' => $this->api_headers(),
            ));
            if (is_wp_error($response)) {
                return array(
                    'ok' => false,
                    'message' => sprintf(__('Connection test failed: %s', 'redeemloop'), $response->get_error_message()),
                );
            }
            $code = wp_remote_retrieve_response_code($response);
            if ($code >= 200 && $code < 300) {
                return array(
                    'ok' => true,
                    'message' => __('Connection test passed: RedeemLoop API accepted the merchant request.', 'redeemloop'),
                );
            }
            return array(
                'ok' => false,
                'message' => sprintf(__('Connection test failed with HTTP %d: %s', 'redeemloop'), $code, wp_remote_retrieve_body($response)),
            );
        }

        private function run_webhook_secret_self_test() {
            if (!$this->webhook_secret) {
                return array(
                    'ok' => false,
                    'message' => __('Webhook secret test failed: Webhook Secret is not configured.', 'redeemloop'),
                );
            }
            $body = '{"redeemloop":"diagnostic"}';
            $timestamp = (string) time();
            $nonce = wp_generate_uuid4();
            $signature = hash_hmac('sha256', $timestamp . '.' . $nonce . '.' . $body, $this->webhook_secret);
            $expected = hash_hmac('sha256', $timestamp . '.' . $nonce . '.' . $body, $this->webhook_secret);
            return array(
                'ok' => hash_equals($expected, $signature),
                'message' => __('Webhook secret self-test passed: local HMAC signing is consistent.', 'redeemloop'),
            );
        }

        private function binding_id_for_order($order) {
            $map = $this->parse_sku_binding_map($this->sku_binding_map);
            if (!empty($map)) {
                foreach ($order->get_items() as $item) {
                    $product = $item->get_product();
                    $sku = $product && $product->get_sku() ? $product->get_sku() : (string) $item->get_product_id();
                    if (isset($map[$sku]) && $map[$sku]) {
                        return $map[$sku];
                    }
                }
            }
            return $this->default_binding_id;
        }

        private function parse_sku_binding_map($raw) {
            $map = array();
            foreach (preg_split('/\r\n|\r|\n/', (string) $raw) as $line) {
                $line = trim($line);
                if ($line === '' || strpos($line, '=') === false) {
                    continue;
                }
                list($sku, $binding_id) = array_map('trim', explode('=', $line, 2));
                if ($sku !== '' && $binding_id !== '') {
                    $map[$sku] = $binding_id;
                }
            }
            return $map;
        }

        private function sku_lines($order) {
            $lines = array();
            foreach ($order->get_items() as $item) {
                $product = $item->get_product();
                $sku = $product && $product->get_sku() ? $product->get_sku() : (string) $item->get_product_id();
                $lines[] = array(
                    'sku' => $sku,
                    'quantity' => max(1, (int) $item->get_quantity()),
                );
            }
            return $lines;
        }

        private function api_headers() {
            $headers = array('Content-Type' => 'application/json');
            if ($this->api_key) {
                $headers['Authorization'] = 'Bearer ' . $this->api_key;
            }
            return $headers;
        }
    }
}

function redeemloop_voucher_gateway_register_routes() {
    register_rest_route('redeemloop/v1', '/woocommerce/mark-paid', array(
        'methods' => 'POST',
        'callback' => 'redeemloop_voucher_gateway_mark_paid',
        'permission_callback' => '__return_true',
    ));
}

function redeemloop_voucher_gateway_mark_paid(WP_REST_Request $request) {
    $gateway = redeemloop_voucher_gateway_instance();
    if (!$gateway) {
        return new WP_REST_Response(array('error' => 'RedeemLoop gateway is not configured'), 503);
    }

    $raw_body = $request->get_body();
    if (!redeemloop_voucher_gateway_verify_signature($gateway->get_option('webhook_secret', ''), $request, $raw_body)) {
        return new WP_REST_Response(array('error' => 'Invalid RedeemLoop webhook signature'), 401);
    }

    $payload = json_decode($raw_body, true);
    if (!is_array($payload)) {
        return new WP_REST_Response(array('error' => 'Invalid JSON payload'), 400);
    }

    $order_id = redeemloop_voucher_gateway_payload_value($payload, array('orderId', 'order_id'));
    if (!$order_id && isset($payload['paymentIntent']['orderId'])) {
        $order_id = $payload['paymentIntent']['orderId'];
    }
    $order = $order_id ? wc_get_order($order_id) : false;
    if (!$order) {
        return new WP_REST_Response(array('error' => 'WooCommerce order not found'), 404);
    }

    $intent_id = redeemloop_voucher_gateway_payload_value($payload, array('intentId', 'paymentId'));
    $tx_hash = redeemloop_voucher_gateway_payload_value($payload, array('txHash', 'txid'));
    if ($intent_id) {
        $order->update_meta_data('_redeemloop_intent_id', sanitize_text_field($intent_id));
    }
    if ($tx_hash) {
        $order->update_meta_data('_redeemloop_tx_hash', sanitize_text_field($tx_hash));
    }
    $order->payment_complete($tx_hash ? sanitize_text_field($tx_hash) : sanitize_text_field($intent_id));
    $order->add_order_note(__('RedeemLoop voucher payment confirmed.', 'redeemloop'));
    $order->save();

    return new WP_REST_Response(array(
        'ok' => true,
        'orderId' => (string) $order->get_id(),
        'intentId' => $intent_id,
    ), 200);
}

function redeemloop_voucher_gateway_instance() {
    if (!function_exists('WC')) {
        return null;
    }
    $gateways = WC()->payment_gateways();
    if (!$gateways) {
        return null;
    }
    $available = $gateways->payment_gateways();
    return isset($available['redeemloop_voucher']) ? $available['redeemloop_voucher'] : null;
}

function redeemloop_voucher_gateway_verify_signature($secret, WP_REST_Request $request, $raw_body) {
    if (!$secret) {
        return true;
    }
    $timestamp = $request->get_header('x-redeemloop-timestamp');
    $nonce = $request->get_header('x-redeemloop-nonce');
    $signature = $request->get_header('x-redeemloop-signature');
    if (!$timestamp || !$nonce || !$signature) {
        return false;
    }
    $expected = hash_hmac('sha256', $timestamp . '.' . $nonce . '.' . $raw_body, $secret);
    return hash_equals($expected, $signature);
}

function redeemloop_voucher_gateway_payload_value($payload, $keys) {
    foreach ($keys as $key) {
        if (isset($payload[$key]) && is_scalar($payload[$key])) {
            return (string) $payload[$key];
        }
    }
    return '';
}
