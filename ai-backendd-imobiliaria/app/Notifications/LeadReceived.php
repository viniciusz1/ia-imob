<?php

namespace App\Notifications;

use App\Models\Lead;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class LeadReceived extends Notification
{
    use Queueable;

    public function __construct(public Lead $lead) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $message = (new MailMessage)
            ->subject('Novo contato recebido no seu site')
            ->greeting('Novo lead!')
            ->line($this->lead->name.' demonstrou interesse.')
            ->line('Telefone: '.$this->lead->phone);

        if ($this->lead->email) {
            $message->line('E-mail: '.$this->lead->email);
        }

        if ($this->lead->message) {
            $message->line('Mensagem: '.$this->lead->message);
        }

        return $message;
    }
}
