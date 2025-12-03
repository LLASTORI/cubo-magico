import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteEmailRequest {
  inviteId: string;
  email: string;
  projectName: string;
  inviterName: string;
  role: string;
  expiresAt: string;
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

const getRoleLabel = (role: string): string => {
  const labels: Record<string, string> = {
    owner: 'Proprietário',
    manager: 'Gerente',
    operator: 'Operador',
  };
  return labels[role] || escapeHtml(role);
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { inviteId, email, projectName, inviterName, role, expiresAt }: InviteEmailRequest = await req.json();

    console.log(`Sending invite email to ${email} for project ${projectName}`);

    // Escape user-controlled values to prevent HTML injection
    const safeInviterName = escapeHtml(inviterName);
    const safeProjectName = escapeHtml(projectName);
    const safeRoleLabel = getRoleLabel(role);

    const appUrl = Deno.env.get("APP_URL") || "https://cubomagico.leandrolastori.com.br";
    const expirationDate = new Date(expiresAt).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const emailResponse = await resend.emails.send({
      from: "Cubo Mágico <noreply@cubomagico.leandrolastori.com.br>",
      to: [email],
      subject: `Você foi convidado para o projeto "${safeProjectName}"`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Convite para Projeto</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 12px 12px 0 0;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">🎲 Cubo Mágico</h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="margin: 0 0 20px; color: #18181b; font-size: 24px; font-weight: 600;">Você foi convidado!</h2>
                      
                      <p style="margin: 0 0 20px; color: #52525b; font-size: 16px; line-height: 1.6;">
                        <strong>${safeInviterName}</strong> convidou você para participar do projeto <strong>"${safeProjectName}"</strong> como <strong>${safeRoleLabel}</strong>.
                      </p>
                      
                      <div style="background-color: #f4f4f5; border-radius: 8px; padding: 20px; margin: 20px 0;">
                        <table role="presentation" style="width: 100%; border-collapse: collapse;">
                          <tr>
                            <td style="padding: 8px 0; color: #71717a; font-size: 14px;">Projeto:</td>
                            <td style="padding: 8px 0; color: #18181b; font-size: 14px; font-weight: 500; text-align: right;">${safeProjectName}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #71717a; font-size: 14px;">Função:</td>
                            <td style="padding: 8px 0; color: #18181b; font-size: 14px; font-weight: 500; text-align: right;">${safeRoleLabel}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #71717a; font-size: 14px;">Expira em:</td>
                            <td style="padding: 8px 0; color: #18181b; font-size: 14px; font-weight: 500; text-align: right;">${expirationDate}</td>
                          </tr>
                        </table>
                      </div>
                      
                      <p style="margin: 0 0 30px; color: #52525b; font-size: 16px; line-height: 1.6;">
                        Para aceitar o convite, acesse sua conta no Cubo Mágico e vá até a seção de projetos.
                      </p>
                      
                      <div style="text-align: center;">
                        <a href="${appUrl}/projects" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                          Acessar Cubo Mágico
                        </a>
                      </div>
                      
                      <p style="margin: 30px 0 0; color: #a1a1aa; font-size: 14px; line-height: 1.6;">
                        Se você não reconhece este convite, pode ignorar este email.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 20px 40px; text-align: center; border-top: 1px solid #e4e4e7;">
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

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-invite-email function:", error);
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
