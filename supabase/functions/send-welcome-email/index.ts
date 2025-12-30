import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  email: string;
  name: string;
  planName: string;
  transactionId: string;
}

// HTML escape function to prevent XSS/HTML injection
const escapeHtml = (text: string): string => {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { email, name, planName, transactionId, internalSecret } = body as WelcomeEmailRequest & { internalSecret?: string };

    // Validate internal secret for internal calls (from other edge functions)
    const expectedSecret = Deno.env.get("SEND_WELCOME_EMAIL_SECRET");
    if (expectedSecret && internalSecret !== expectedSecret) {
      console.error('Invalid internal secret provided');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Sending welcome email to ${email} for plan ${planName}`);

    // Escape user-controlled values to prevent HTML injection
    const safeName = escapeHtml(name || 'Cliente');
    const safePlanName = escapeHtml(planName || 'Cubo Mágico');

    // Use production URL - NEVER use localhost
    const appUrl = "https://cubomagico.leandrolastori.com.br";
    const logoUrl = `${appUrl}/app-logo-512.png`;

    // Create Supabase client to generate password reset link
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Generate password reset link for the user to set their password
    // Using magiclink type instead of recovery to create a proper login link
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: `${appUrl}/reset-password`
      }
    });

    let resetLink = `${appUrl}/forgot-password`;
    
    if (linkError) {
      console.error('Error generating magic link, will use forgot password fallback:', linkError);
      // Continue with fallback link instead of throwing
    } else if (linkData?.properties?.action_link) {
      // Replace localhost with production URL if it appears in the generated link
      resetLink = linkData.properties.action_link.replace(
        /http:\/\/localhost:\d+/g, 
        appUrl
      );
      console.log('Magic link generated successfully');
    }

    console.log('Password reset link generated successfully');

    const emailResponse = await resend.emails.send({
      from: "Cubo Mágico <noreply@cubomagico.leandrolastori.com.br>",
      to: [email],
      subject: `🎲 Bem-vindo ao Cubo Mágico! Sua conta foi criada`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Bem-vindo ao Cubo Mágico</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 12px 12px 0 0;">
                      <img src="${logoUrl}" alt="Cubo Mágico" style="width: 80px; height: 80px; margin-bottom: 16px; border-radius: 12px;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Cubo Mágico</h1>
                      <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Inteligência para Funis de Vendas</p>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="margin: 0 0 20px; color: #18181b; font-size: 24px; font-weight: 600;">Bem-vindo, ${safeName}! 🎉</h2>
                      
                      <p style="margin: 0 0 20px; color: #52525b; font-size: 16px; line-height: 1.6;">
                        Sua compra foi confirmada e sua conta no <strong>Cubo Mágico</strong> foi criada automaticamente!
                      </p>
                      
                      <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #22c55e;">
                        <p style="margin: 0; color: #166534; font-size: 14px; font-weight: 600;">✅ Plano Ativado:</p>
                        <p style="margin: 8px 0 0; color: #15803d; font-size: 18px; font-weight: 700;">${safePlanName}</p>
                      </div>
                      
                      <p style="margin: 0 0 20px; color: #52525b; font-size: 16px; line-height: 1.6;">
                        Para acessar sua conta, você precisa <strong>criar uma senha</strong>. Clique no botão abaixo:
                      </p>
                      
                      <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetLink}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);">
                          Criar Minha Senha
                        </a>
                      </div>
                      
                      <div style="background-color: #fef3c7; border-radius: 8px; padding: 16px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                        <p style="margin: 0; color: #92400e; font-size: 14px;">
                          ⚠️ Este link expira em 24 horas. Após criar sua senha, você poderá acessar a plataforma normalmente.
                        </p>
                      </div>
                      
                      <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 30px 0;">
                      
                      <h3 style="margin: 0 0 15px; color: #18181b; font-size: 18px; font-weight: 600;">Próximos Passos:</h3>
                      
                      <table role="presentation" style="width: 100%; border-collapse: collapse;">
                        <tr>
                          <td style="padding: 12px 0; vertical-align: top; width: 40px;">
                            <span style="display: inline-block; width: 28px; height: 28px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #fff; border-radius: 50%; text-align: center; line-height: 28px; font-size: 14px; font-weight: 600;">1</span>
                          </td>
                          <td style="padding: 12px 0; color: #52525b; font-size: 15px; line-height: 1.5;">
                            <strong>Crie sua senha</strong> clicando no botão acima
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 12px 0; vertical-align: top;">
                            <span style="display: inline-block; width: 28px; height: 28px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #fff; border-radius: 50%; text-align: center; line-height: 28px; font-size: 14px; font-weight: 600;">2</span>
                          </td>
                          <td style="padding: 12px 0; color: #52525b; font-size: 15px; line-height: 1.5;">
                            <strong>Configure suas integrações</strong> com Hotmart e Meta Ads
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 12px 0; vertical-align: top;">
                            <span style="display: inline-block; width: 28px; height: 28px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #fff; border-radius: 50%; text-align: center; line-height: 28px; font-size: 14px; font-weight: 600;">3</span>
                          </td>
                          <td style="padding: 12px 0; color: #52525b; font-size: 15px; line-height: 1.5;">
                            <strong>Comece a analisar</strong> seus funis com inteligência
                          </td>
                        </tr>
                      </table>
                      
                      <p style="margin: 30px 0 0; color: #a1a1aa; font-size: 14px; line-height: 1.6;">
                        Se você não realizou esta compra, por favor entre em contato conosco respondendo este email.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 20px 40px; text-align: center; border-top: 1px solid #e4e4e7; background-color: #fafafa; border-radius: 0 0 12px 12px;">
                      <p style="margin: 0 0 10px; color: #71717a; font-size: 13px;">
                        Precisa de ajuda? Entre em contato pelo email <a href="mailto:suporte@cubomagico.leandrolastori.com.br" style="color: #6366f1; text-decoration: none;">suporte@cubomagico.leandrolastori.com.br</a>
                      </p>
                      <p style="margin: 0; color: #a1a1aa; font-size: 12px;">
                        © ${new Date().getFullYear()} Cubo Mágico. Todos os direitos reservados.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    console.log("Welcome email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-welcome-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
